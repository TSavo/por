/**
 * Execute two procedures translated from Pool of Radiance and check the result.
 * ovl07_0000 is the ECL operand fetch at the start of overlay slice 7.
 * sys5bb_16b5 is System.FillChar.
 */
import { Cpu } from "../src/cpu/machine.js";
import { ovl07_0000, ovl07_0c93 } from "../src/translated/ovl07.js";
import "../src/translated/system5bb.js";
import { farCall } from "../src/runtime/far.js";
import { attachQuickRecovery } from "../src/runtime/quick-combat.js";
import { attachDos } from "../src/runtime/dos.js";
import { isPartyFile } from "./save-slots.js";
import { openJournalProfile } from "./journal-profile.js";
import { exe_056c0, exe_05e44 } from "../src/translated/exe.js";
import type { LoadedSlice } from "../src/runtime/overlay.js";
import { currentObjective, discoveredLeads, progressAddresses, questProgress } from "../src/runtime/adventure-log.js";
import { commissions } from "../src/runtime/commission-journal.js";
import { parseDax } from "../src/lib/dax.js";
import { disassemble, scriptFromBlock } from "../src/lib/ecl.js";
import { findGameRoot, listGameFiles, readGameFile } from "./gamedata.js";

function fresh(): Cpu {
  const m = new Cpu();
  m.ds = 0x2000;
  m.ss = 0x2000;
  m.es = 0x2000;
  m.cs = 0x3000;
  m.sp = 0xff00;
  return m;
}

function checkFillChar(): void {
  const m = fresh();
  // FillChar(dest, count, value). Stack at entry, last push is the first read at [bx+4].
  // Caller pushes dest_seg, dest_off, count, value, then far-call pushes cs, ip.
  const seg = 0x4000;
  m.push(seg);
  m.push(0x10);
  m.push(4);
  m.push(0x7e);
  m.push(m.cs);
  m.push(0);
  farCall(m, 0x5bb, 0x16b5);
  const bytes = [0, 1, 2, 3].map((i) => m.read8(seg, 0x10 + i));
  if (bytes.join(",") !== "126,126,126,126") {
    throw new Error(`FillChar wrote ${bytes}`);
  }
  console.log("verified sys5bb_16b5 FillChar  START.EXE 5bb:16b5");
}

function checkOperandFetch(): void {
  const m = fresh();
  const eclSeg = 0x5000;
  // Far pointer at DS:0x493f. Index 0x98ff, then the procedure adds 1 and 0x6700,
  // which wraps to offset 0 of this segment. See the instruction at ovl07_0000 / 0x0022.
  m.write16(m.ds, 0x493f, 0);
  m.write16(m.ds, 0x4941, eclSeg);
  m.write16(m.ds, 0x494e, 0x98ff);
  m.write8(eclSeg, 0, 0x00);
  m.write8(eclSeg, 1, 0x2a);
  m.ax = 1;
  m.push(m.ax);
  m.push(m.cs);
  m.push(0);
  ovl07_0000(m);
  const code = m.read8(m.ds, 0x6dcb + 1);
  const low = m.read8(m.ds, 0x6e4b + 1);
  const index = m.read16(m.ds, 0x494e);
  if (code !== 0x00 || low !== 0x2a || index !== 0x9902) {
    throw new Error(`operand fetch code=${code} low=${low} index=${index.toString(16)}`);
  }
  console.log("verified ovl07_0000 ECL operand fetch  GAME.OVR slice 7 +0x0000");
}

checkFillChar();
checkOperandFetch();

function checkCarryArithmetic(): void {
  const m = fresh();
  for (const width of [8, 16] as const) {
    const limit = 2 ** width;
    const sign = limit / 2;
    const signed = (value: number) => value < sign ? value : value - limit;
    const values = width === 8 ? Array.from({ length: limit }, (_, i) => i)
      : [0, 1, sign - 1, sign, sign + 1, limit - 2, limit - 1];
    for (const a of values) for (const b of values) for (const carry of [0, 1]) {
      for (const direction of [1, -1]) {
        m.cf = carry === 1;
        const result = direction === 1 ? m.setAdcFlags(width, a, b) : m.setSbbFlags(width, a, b);
        const exact = a + direction * (b + carry);
        const signedExact = signed(a) + direction * (signed(b) + carry);
        if (result !== ((exact + limit) % limit) || m.cf !== (exact < 0 || exact >= limit) ||
            m.of !== (signedExact < -sign || signedExact >= sign) || m.zf !== (result === 0) ||
            m.sf !== (result >= sign)) {
          throw new Error(`Incorrect ${width}-bit ${direction === 1 ? "ADC" : "SBB"} flags for ${a}, ${b}, carry ${carry}`);
        }
      }
    }
  }
  console.log("verified ADC and SBB carry, borrow, and signed overflow");
}

checkCarryArithmetic();

function checkCrtRetrace(): void {
  const m = fresh();
  attachDos(m, []);
  m.write8(m.ds, 0x82bb, 1);
  m.write8(m.ds, 0x82be, 7);
  m.write8(m.es, 0x100, 0x41);
  m.si = 0x100;
  m.di = 0x101;
  m.bx = 1;
  m.stepBudget = 1000;
  m.push(0);
  exe_056c0(m);
  if (m.read16(0xb800, 2) !== 0x0741 || m.steps < 100 || m.sp !== 0xff00) {
    throw new Error("Translated Crt routine did not write the character after retrace");
  }
  console.log("verified original Crt retrace wait and text write");
}

checkCrtRetrace();

function checkPartySaveFiles(): void {
  for (const letter of "ABCDEFGHIJ") {
    if (!isPartyFile(`SAVE\\CHRDAT${letter}6.SAV`, letter) || isPartyFile("SAVE\\CHRDATZ1.SAV") ||
        isPartyFile("SAVE\\CHRDATA1.ITM", letter) !== (letter === "A")) {
      throw new Error(`Invalid native party-file naming for slot ${letter}`);
    }
  }
  const m = fresh();
  const slotA = "SAVE\\SAVGAMA.DAT";
  const slotB = "SAVE\\SAVGAMB.DAT";
  const character = "SAVE\\CHRDATA1.SAV";
  const spells = "SAVE\\CHRDATA1.SPC";
  const file = (name: string, byte: number) => ({ name, data: Uint8Array.of(byte) });
  attachDos(m, [file(slotA, 1), file(slotB, 2), file(character, 3)], [], undefined, undefined, undefined,
    (name) => name === slotA ? [file(character, 4), file(spells, 5)] : name === slotB ? [] : undefined);
  const read = (name: string): number | undefined => {
    const path = Buffer.from(name + "\0", "ascii");
    m.mem.set(path, m.linear(m.ds, 0x100));
    m.dx = 0x100;
    m.ax = 0x3d00;
    m.intr(0x21);
    if (m.cf) return;
    m.bx = m.ax;
    m.ah = 0x3f;
    m.cx = 1;
    m.dx = 0x200;
    m.intr(0x21);
    if (m.cf || m.ax !== 1) throw new Error(`DOS fixture could not read ${name}`);
    m.ah = 0x3e;
    m.intr(0x21);
    return m.read8(m.ds, 0x200);
  };
  if (read(slotA) !== 1 || read(character) !== 4 || read(spells) !== 5 ||
      read(slotB) !== 2 || read(character) !== 3 || read(spells) !== undefined) {
    throw new Error("A slot reused another party's character files");
  }
  console.log("verified DOS party files switch with the selected save slot");
}

checkPartySaveFiles();

function checkQuickRecovery(partyMember: boolean): void {
  const m = fresh();
  const stack = m.sp;
  const actor = 0x100;
  m.bp = 0xff40;
  m.stepBudget = 100;
  m.write8(m.ss, m.bp - 2, 1);
  m.write8(m.ds, actor + 0x10f, 1);
  m.write8(m.ds, actor + 0x84, partyMember ? 0 : 0x80);
  m.push(m.ds);
  m.push(actor);
  m.push(m.cs);
  m.push(partyMember ? 0x477 : 0x2b3);
  const slice = (index: number, headerPara: number, loadPara: number): LoadedSlice =>
    ({ index, headerPara, loadPara, fileOffset: 0, codeBytes: 0, procs: new Map() });
  let recovered: boolean | undefined;
  attachQuickRecovery(m, [slice(8, 0x51, m.cs), slice(9, 0x58, 0x4000)], (party) => { recovered = party; }, 1);
  farCall(m, 0x58, 0x25);
  const expected = partyMember ? 0 : 1;
  if (recovered !== partyMember || m.sp !== stack || m.bp !== 0xff40 || m.cs !== 0x3000 || m.stepBudget !== 100 ||
      m.read8(m.ss, m.bp - 2) !== expected || m.read8(m.ds, actor + 0x10f) !== expected) {
    throw new Error("Quick watchdog did not restore the expected combat control");
  }
  console.log(partyMember ? "verified Quick timeout returns to manual combat" : "verified enemy Quick timeout retains automatic control");
}

checkQuickRecovery(true);
checkQuickRecovery(false);

function checkSokalQuestProgress(): void {
  const m = fresh();
  m.write16(m.ds, 0x4933, 0x20);
  m.write16(m.ds, 0x4935, 0x5000);
  const offered = discoveredLeads("SOKAL KEEP ON THORN ISLAND MUST BE CLEARED.");

  // Run the original ECL global setter used in the keep's success branch
  // and the council's reward routine.
  const saveSokalState = (value: number) => {
    m.push(0x4aa7);
    m.push(value);
    m.push(m.cs);
    m.push(0);
    ovl07_0c93(m);
  };

  saveSokalState(254);
  const ready = questProgress(m, offered, m.ds);
  if (ready[0]?.status !== "ready-to-report" || !currentObjective(ready).nextStep.includes("council clerk") ||
      questProgress(m, [], m.ds).length !== 0) {
    throw new Error("The journal did not recognize the original keep-clear flag");
  }
  const announced = discoveredLeads("WITH SOKAL KEEP IN OUR HANDS, WE CAN USE BOATS TO BYPASS THE BARREN RIVER.");
  if (announced[0]?.status !== "reward-pending") {
    throw new Error("The journal closed the quest before the original reward flag was written");
  }
  saveSokalState(255);
  if (questProgress(m, offered, m.ds)[0]?.status !== "turned-in") {
    throw new Error("The journal did not recognize the original reward flag");
  }
  console.log("verified Sokal journal progression against the translated ECL setter");
}

checkSokalQuestProgress();

function checkCampaignJournal(): void {
  const root = findGameRoot();
  if (!root) {
    console.log("campaign dialogue checks skipped (original game data unavailable)");
    return;
  }
  const blocks = listGameFiles(root).filter((name) => /^ecl.*\.dax$/i.test(name)).flatMap((name) =>
    parseDax(name, readGameFile(root, name)).entries.map(({ data }) =>
      disassemble(scriptFromBlock(data)).instructions));
  const lines = blocks.flatMap((block) => block.flatMap(({ operands }) =>
    operands.flatMap(({ text }) => text === null ? [] : [text])));
  const council = blocks.find((block) => block.some(({ name, operands }) =>
    name === "GET TABLE" && operands[0]?.word === 0x4aa6 && operands[1]?.word === 0x6e79));
  const rewardDispatch = council?.find(({ address, name }) => address === 0x9d63 && name === "ON GOSUB");
  if (!council || !rewardDispatch) throw new Error("Original council reward dispatch missing");
  const m = fresh();
  m.write16(m.ds, 0x4933, 0x20);
  m.write16(m.ds, 0x4935, 0x5000);
  const writeGlobal = (address: number, value: number) => {
    m.push(address);
    m.push(value);
    m.push(m.cs);
    m.push(0);
    ovl07_0c93(m);
  };
  const slums = commissions.find(({ id }) => id === "slums")!;
  const slumsFlag = progressAddresses.slums!;
  const slumsCounter = blocks.find((block) => block.some(({ address, name, operands }) =>
    address === 0xb6ad && name === "COMPARE" && operands[0]?.word === slumsFlag && operands[1]?.low === 25));
  if (!slumsCounter) throw new Error("Missing the original Slums encounter counter threshold");
  const profile = openJournalProfile();
  for (const count of [1, 2, 24, 254, 255]) {
    writeGlobal(slumsFlag, count);
    const lead = profile(slums.offer, (known) => questProgress(m, known, m.ds))[0];
    if (count < 25 ? lead?.clearedEncounters !== count :
      lead?.status !== (count === 254 ? "ready-to-report" : "turned-in")) {
      throw new Error(`Slums journal did not follow counter value ${count}`);
    }
  }
  for (const commission of commissions) {
    const id = `commission-${commission.id}`;
    const lookup = (text: string) => discoveredLeads(text).find((lead) => lead.id === id);
    const fromGame = (trigger: string) => {
      const line = lines.find((text) => text.replace(/\s+/g, " ").includes(trigger));
      if (line === undefined) throw new Error(`Original dialogue trigger missing for ${id}: ${trigger}`);
      return line;
    };
    const offer = lookup(fromGame(commission.offer));
    if (offer?.status !== "offered" || currentObjective([offer]).nextStep !== commission.next) {
      throw new Error(`Journal offer mismatch for ${id}`);
    }
    if (commission.accepted && lookup(fromGame(commission.accepted))?.status !== "accepted") {
      throw new Error(`Journal acceptance mismatch for ${id}`);
    }
    for (const alternate of commission.alternateOffers ?? []) {
      if (lookup(fromGame(alternate))?.status !== "offered") throw new Error(`Journal alternate offer mismatch for ${id}`);
    }
    const address = progressAddresses[commission.id];
    if (commission.report && lookup(fromGame(commission.report))?.status !==
        (address === undefined && commission.id !== "ohlo" ? "turned-in" : "reward-pending")) {
      throw new Error(`Journal reward dialogue mismatch for ${id}`);
    }
    if (address !== undefined) {
      const entry = rewardDispatch.operands[2 + address - 0x4aa6]?.word;
      const handler = council.findIndex(({ address: ip }) => ip === entry);
      if (handler < 0 || !commission.report || !council.slice(handler, handler + 5).some(({ operands }) =>
        operands.some(({ text }) => text?.includes(commission.report!)))) {
        throw new Error(`Original council dispatch does not pair ${id} with its reward flag`);
      }
      writeGlobal(address, 254);
      if (questProgress(m, [offer], m.ds)[0]?.status !== "ready-to-report" || questProgress(m, [], m.ds).length) {
        throw new Error(`Journal completion flag mismatch for ${id}`);
      }
      writeGlobal(address, 255);
      if (questProgress(m, [offer], m.ds)[0]?.status !== "turned-in") {
        throw new Error(`Journal reward flag mismatch for ${id}`);
      }
    }
  }
  const textile = progressAddresses.textile!;
  const auction = commissions.find(({ id }) => id === "auction")!;
  const auctionOffer = discoveredLeads(auction.offer);
  writeGlobal(progressAddresses.auction!, 254);
  const auctionReady = questProgress(m, auctionOffer, m.ds);
  for (const [fragment, hint] of [["IT'S ONLY A WAND OF FEAR", "Wand of Fear"],
    ["THE AUCTION IS CANCELLED!", "was cancelled"],
    ["A MAN AND OGRE EXCHANGE THE WAND", "exchanged the wand"],
    ["IT'S A WAND OF ILLUMINATION", "what the party saw"]]) {
    const line = lines.find((text) => text.includes(fragment!));
    if (!line || !currentObjective([...auctionReady, ...discoveredLeads(line)]).nextStep.includes(hint!)) {
      throw new Error(`Auction journal reported an incorrect outcome for ${fragment}`);
    }
  }
  const ironBox = lines.find((line) => line.includes("ACROSS THE LOCK IS THE SEAL OF THE FAMILY OF CADORNA"))!;
  const boxLead = discoveredLeads(ironBox);
  const textileOffer = discoveredLeads(commissions.find(({ id }) => id === "textile")!.offer);
  const skullcrusher = lines.find((line) => line.includes("MY NAME IS SKULLCRUSHER. THERE'S A SECRET DOOR"));
  if (!skullcrusher || currentObjective(textileOffer).nextStep.includes("secret door") ||
      !currentObjective([...textileOffer, ...discoveredLeads(skullcrusher)]).nextStep.includes("search southeast") ||
      !currentObjective(boxLead).nextStep.includes("Take It Unopened")) {
    throw new Error("Textile House journal clues did not follow the dialogue the party witnessed");
  }
  writeGlobal(textile, 0);
  for (const [box, hint] of [[1, "sealed box"], [128, "seal is broken"]] as const) {
    writeGlobal(0x4ac8, box);
    if (!currentObjective(questProgress(m, boxLead, m.ds)).nextStep.includes(hint) ||
        questProgress(m, [], m.ds).length) {
      throw new Error(`Cadorna's journal did not follow treasure state ${box}`);
    }
  }
  writeGlobal(textile, 254);
  if (questProgress(m, boxLead, m.ds)[0]?.status !== "ready-to-report") {
    throw new Error("Cadorna's journal did not move on after the Watch handoff");
  }
  const confrontation = lines.find((line) => line.includes("COUNCILMAN CADORNA CONFRONTS YOU"));
  writeGlobal(textile, 255);
  if (!confrontation || !questProgress(m, [...boxLead, ...discoveredLeads(confrontation)], m.ds)[0]?.title.includes("without payment")) {
    throw new Error("Cadorna's journal did not distinguish the confrontation from the paid turn-in");
  }
  if (discoveredLeads("A SPECIAL PRIZE FOR ENDING THE GRAVEYARD MENACE").some(({ id }) =>
    id === "commission-bottle-vampire")) {
    throw new Error("The graveyard reward revealed an undiscovered bottle objective");
  }
  const vampireOffer = lines.find((line) => line.includes("WHEN YOU MEET THE VAMPIRE USE THE BOTTLE"));
  const vampireLocation = lines.find((line) => line.includes("A VAMPIRE WHO LURKS IN THE NORTHEAST CORNER"));
  if (!vampireOffer || !vampireLocation) throw new Error("Missing graveyard clues in original scripts");
  const vampireLeads = discoveredLeads(vampireOffer + "\n" + vampireLocation);
  if (!currentObjective(vampireLeads, "commission-bottle-vampire").nextStep.includes("northeast corner") ||
      currentObjective(discoveredLeads(vampireOffer)).nextStep.includes("northeast corner")) {
    throw new Error("The journal did not gate the vampire's location on witnessed dialogue");
  }
  writeGlobal(progressAddresses.graveyard!, 254);
  if (questProgress(m, vampireLeads, m.ds).find(({ id }) => id === "commission-bottle-vampire")?.status !== "turned-in" ||
      questProgress(m, [], m.ds).some(({ id }) => id === "commission-bottle-vampire")) {
    throw new Error("The graveyard flag did not resolve the known bottle objective without revealing it");
  }
  const acceptance = [["graveyard", 0x4a96, 255], ["auction", progressAddresses.auction!, 1], ["textile", 0x4a97, 255],
    ["gate", 0x4a99, 255], ["castle", 0x4a9a, 255]] as const;
  for (const [id, address, value] of acceptance) {
    const commission = commissions.find((item) => item.id === id)!;
    if (!council.some(({ name, operands }) => name === "SAVE" &&
      operands[0]?.low === value && operands[1]?.word === address)) {
      throw new Error(`Missing original council assignment write for ${id}`);
    }
    writeGlobal(progressAddresses[id]!, 0);
    writeGlobal(address, value);
    const offered = discoveredLeads(commission.offer);
    if (questProgress(m, offered, m.ds)[0]?.status !== "accepted" || questProgress(m, [], m.ds).length) {
      throw new Error(`Journal assignment state mismatch for ${id}`);
    }
  }
  const gate = commissions.find(({ id }) => id === "gate")!;
  const garrison = lines.find((line) => line.includes("YOU HAVE SLAIN THE GARRISON"));
  const summons = lines.find((line) => line.includes("YOU ARE SUMMONED TO A SPECIAL COUNCIL MEETING"));
  const gateLeads = discoveredLeads(gate.offer);
  if (!garrison || !summons ||
      !currentObjective([...gateLeads, ...discoveredLeads(garrison)]).nextStep.includes("outside guards")) {
    throw new Error("The gate journal missed the garrison clue or assault summons");
  }
  writeGlobal(progressAddresses.gate!, 255);
  if (!currentObjective([...questProgress(m, gateLeads, m.ds), ...discoveredLeads(summons)]).nextStep.includes("council chambers")) {
    throw new Error("The gate journal did not direct the party to the assault briefing");
  }
  const route = [
    ["THE BOAT DISEMBARKS YOU AT SOKAL KEEP", "Scout the keep"],
    ["TO THE WEST RISES A MOUND OF REEDS", "west of the gates"],
    ["IN A POUCH ON THE REMAINS IS A CRUMBLING PARCHMENT SCROLL", "speak to an undead patrol"],
    ["A LOUD COMMOTION RISES FROM THE COURTYARD", "Prepare for the orcs and hobgoblins"],
    ["ON A HOBGOBLIN BODY, YOU FIND A NOTE", "Read journal entry 57"],
    ["THIS WAS ONCE THE CHAPEL OF THE KEEP", "Approach the altar"],
    ["A PALE FORM RISES BEFORE YOU", "Talk to the pale form"],
    ["I AM THE LIFE FORM OF FERRAN MARTINEZ", "answer him truthfully"],
    ["TO PASS MY GUARDS ON THE WAY OUT", "answer him truthfully"],
  ];
  let transcript = commissions.find(({ id }) => id === "sokal")!.offer;
  writeGlobal(progressAddresses.sokal!, 0);
  for (const [trigger, instruction] of route) {
    const line = lines.find((text) => text.includes(trigger!));
    if (!line) throw new Error(`Missing Sokal route dialogue: ${trigger}`);
    transcript += "\n" + line;
    const leads = discoveredLeads(transcript);
    if (!currentObjective(leads).nextStep.includes(instruction!) ||
        leads.some(({ id }) => id === "sokal-departure") !== trigger?.startsWith("TO PASS MY GUARDS")) {
      throw new Error(`Sokal journal route mismatch: ${trigger}`);
    }
  }
  writeGlobal(progressAddresses.sokal!, 254);
  const learned = discoveredLeads(transcript);
  if (!currentObjective([...questProgress(m, learned, m.ds), ...learned]).nextStep.includes("Ferran's password")) {
    throw new Error("Sokal journal lost Ferran's exit instruction on completion");
  }
  const lie = lines.find((line) => line.includes("'YOU LIE,' THE SPIRIT MOANS AS IT FADES AWAY"));
  if (!lie) throw new Error("Missing original Ferran rejection dialogue");
  writeGlobal(progressAddresses.sokal!, 0);
  const rejected = discoveredLeads(transcript.split("\n").slice(0, -1).join("\n") + "\n" + lie);
  if (!currentObjective(rejected, "commission-sokal").nextStep.includes("Ferran rejected the lie") ||
      rejected.some(({ id }) => id === "sokal-departure") ||
      questProgress(m, rejected, m.ds).some(({ id, status }) => id === "commission-sokal" && status === "ready-to-report")) {
    throw new Error("Sokal journal revealed completion after Ferran rejected the lie");
  }
  const ohlo = commissions.find(({ id }) => id === "ohlo")!;
  const delivered = lines.find((text) => text.includes(ohlo.report!));
  if (!delivered || !slumsCounter.some(({ address, name, operands }) =>
    address === 0xb048 && name === "SAVE" && operands[0]?.low === 250 && operands[1]?.word === 0x4a81)) {
    throw new Error("Original Ohlo pickup or delivery script missing");
  }
  const knownOhlo = discoveredLeads(ohlo.accepted!);
  const guild = lines.find((line) => line.includes("THAT WAS ONCE THE ROPE GUILD"));
  const booth = lines.find((line) => line.includes("I AM SORRY, NOBLE ONES, BUT I HAVE NOTHING TO SELL"));
  if (!guild || !booth || currentObjective(knownOhlo).nextStep.includes("from the west") ||
      !currentObjective([...knownOhlo, ...discoveredLeads(guild)]).nextStep.includes("from the west") ||
      !currentObjective([...knownOhlo, ...discoveredLeads(`${guild}\n${booth}`)]).nextStep.includes("choose Speak")) {
    throw new Error("Ohlo's journal did not guide the party through the witnessed Rope Guild scenes");
  }
  writeGlobal(0x4a04, 250);
  writeGlobal(0x4a81, 250);
  if (!currentObjective(questProgress(m, knownOhlo, m.ds)).nextStep.includes("choose Give")) {
    throw new Error("Ohlo pickup did not change the journal objective");
  }
  const ohloReward = discoveredLeads(delivered);
  if (!currentObjective(ohloReward).nextStep.includes("collecting Ohlo's reward")) {
    throw new Error("Ohlo's dialogue closed his reward early");
  }
  writeGlobal(0x4a04, 255);
  writeGlobal(0x4a81, 255);
  if (questProgress(m, knownOhlo, m.ds).length ||
      questProgress(m, ohloReward, m.ds)[0]?.status !== "turned-in") {
    throw new Error("Ohlo's hostile and successful paths were not distinguished");
  }
  const castle = commissions.find(({ id }) => id === "castle")!;
  const castleFlag = progressAddresses.castle!;
  writeGlobal(castleFlag, 0);
  let castleTranscript = castle.offer;
  const castleRoute = [
    ["USE THESE CLOTHES AS A DISGUISE", "Use the clothes"],
    ["HE JUST HIRED ME TO IMPERSONATE HIM", "real Tyranthraxus"],
    ["AN ANCIENT BRONZE DRAGON", "Get past the guards"],
    ["IF YOU JOIN ME I WILL MAKE YOU THE COMMANDERS", "Choose Attack"],
  ] as const;
  for (const [trigger, direction] of castleRoute) {
    const line = lines.find((text) => text.includes(trigger));
    if (!line) throw new Error(`Missing original Valjevo dialogue: ${trigger}`);
    castleTranscript += "\n" + line;
    if (!currentObjective(discoveredLeads(castleTranscript)).nextStep.includes(direction)) {
      throw new Error(`Valjevo journal route mismatch: ${trigger}`);
    }
  }
  const castleLeads = discoveredLeads(castleTranscript);
  const battle = blocks.find((block) => block.some(({ operands }) =>
    operands.some(({ text }) => text?.includes("TYRANTHRAXUS HAS FINALLY BEEN DEFEATED"))));
  if (!battle?.some(({ name, operands }) =>
    name === "SAVE" && operands[0]?.low === 254 && operands[1]?.word === castleFlag)) {
    throw new Error("Original battle script did not contain the castle completion write");
  }
  writeGlobal(castleFlag, 254);
  if (!currentObjective(questProgress(m, castleLeads, m.ds)).nextStep.includes("council clerk")) {
    throw new Error("The journal did not direct the party to report the castle victory");
  }
  writeGlobal(castleFlag, 255);
  const finale = questProgress(m, castleLeads, m.ds);
  const optional = discoveredLeads(commissions.find(({ id }) => id === "ohlo")!.offer);
  if (currentObjective([...finale, ...optional]).title !== "Phlan is free" ||
      currentObjective([...finale, ...optional], "commission-ohlo").title !== "Fetch Ohlo's potion") {
    throw new Error("The journal did not recognize the campaign ending while preserving optional objectives");
  }
  console.log(`verified ${commissions.length} journal definitions against original ECL dialogue and ${Object.keys(progressAddresses).length} progress flags through the translated setter`);
}

for (const [amount, divisor, quotient] of [[50552, 1000, 50], [200000, 1000, 200], [-50552, 1000, -50]]) {
  const m = fresh();
  m.ax = amount! & 0xffff;
  m.dx = (amount! >> 16) & 0xffff;
  m.cx = divisor!;
  m.push(m.cs);
  m.push(0);
  exe_05e44(m);
  if (((m.dx << 16) | m.ax) !== quotient) throw new Error(`Incorrect translated long division for ${amount}`);
}
console.log("verified Turbo Pascal long division used by training and coin conversion");
checkCampaignJournal();
console.log("translation checks passed");
