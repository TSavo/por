/**
 * Execute two procedures translated from Pool of Radiance and check the result.
 * ovl07_0000 is the ECL operand fetch at the start of overlay slice 7.
 * sys5bb_16b5 is System.FillChar.
 */
import { Cpu } from "../src/cpu/machine.js";
import { ovl07_0000, ovl07_0c93 } from "../src/translated/ovl07.js";
import "../src/translated/system5bb.js";
import { farCall } from "../src/runtime/far.js";
import { attachDos } from "../src/runtime/dos.js";
import { isPartyFile } from "./save-slots.js";
import { openJournalProfile } from "./journal-profile.js";
import { exe_056c0, exe_05e44, exe_06a35 } from "../src/translated/exe.js";
import { currentObjective, discoveredLeads, progressAddresses, questProgress, type JournalLead } from "../src/runtime/adventure-log.js";
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

function checkVal(): void {
  for (const [input, expected] of [["200", 200], ["+200", 200], ["-200", -200], ["$C8", 200]] as const) {
    const m = fresh();
    const inputOffset = 0x100;
    const errorOffset = 0x200;
    m.write8(m.ds, inputOffset, input.length);
    for (let index = 0; index < input.length; index++) {
      m.write8(m.ds, inputOffset + index + 1, input.charCodeAt(index));
    }
    m.push(m.ds);
    m.push(inputOffset);
    m.push(m.ds);
    m.push(errorOffset);
    m.push(m.cs);
    m.push(0);
    exe_06a35(m);
    if ((m.dx << 16 | m.ax) !== expected || m.read16(m.ds, errorOffset) !== 0 || m.sp !== 0xff00) {
      throw new Error(`Turbo Pascal Val did not parse ${input} as ${expected}`);
    }
  }
  console.log("verified Turbo Pascal Val sign handling for numeric input");
}

checkVal();

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
  if (!currentObjective(auctionReady).nextStep.includes("what the party saw")) {
    throw new Error("The auction journal inferred an outcome from the completion flag alone");
  }
  for (const [fragment, hint] of [["IT'S ONLY A WAND OF FEAR", "Wand of Fear"],
    ["THE AUCTION IS CANCELLED!", "was cancelled"],
    ["A MAN AND OGRE EXCHANGE THE WAND", "exchanged the wand"],
    ["IT'S A WAND OF ILLUMINATION", "an onlooker called it a Wand of Illumination"],
    ["YOU DON'T SEE WHO BOUGHT THE ITEM", "before the party could identify the buyer"]]) {
    const line = lines.find((text) => text.includes(fragment!));
    if (!line || !currentObjective([...auctionReady, ...discoveredLeads(line)]).nextStep.includes(hint!)) {
      throw new Error(`Auction journal reported an incorrect outcome for ${fragment}`);
    }
  }
  const gateCommission = commissions.find(({ id }) => id === "gate")!;
  writeGlobal(progressAddresses.gate!, 0);
  const gateProfile = openJournalProfile();
  const gateJournal = (text: string) => gateProfile(text, (known) => questProgress(m, known, m.ds));
  if (currentObjective(gateJournal(gateCommission.offer), "commission-gate").nextStep !== gateCommission.next) {
    throw new Error("The Stojanow Gate offer revealed unobserved clues");
  }
  for (const [trigger, nextStep] of [
    ["A MAN WITH A WAGON OF GOODS", "where the wagon got through"],
    ["HAVE THE 15 GOLD", "asked for 15 gold"],
    ["THE BUGBEAR TAKES THE MONEY", "look for the garrison inside"],
    ["BUGBEARS WERE WAITING ON THE OTHER SIDE OF THE GATE", "bugbears waiting just inside the gate"],
    ["YOU HAVE SLAIN THE GARRISON", "outside guards"],
  ] as const) {
    const line = lines.find((text) => text.includes(trigger));
    if (!line || !currentObjective(gateJournal(line), "commission-gate").nextStep.includes(nextStep)) {
      throw new Error(`The Stojanow Gate journal did not advance after ${trigger}`);
    }
  }
  const refusedGateProfile = openJournalProfile();
  const refusedGateJournal = (text: string) => refusedGateProfile(text, (known) => questProgress(m, known, m.ds));
  refusedGateJournal(gateCommission.offer);
  for (const [trigger, nextStep] of [
    ["COME BACK WHEN YOU'VE LEARNED THE RULES", "bugbear turned you away"],
    ["THEY ARE IMPOSTERS", "Flee, Surrender, or Attack"],
  ] as const) {
    const line = lines.find((text) => text.includes(trigger));
    if (!line || !currentObjective(refusedGateJournal(line), "commission-gate").nextStep.includes(nextStep)) {
      throw new Error(`The Stojanow Gate journal missed the alternate outcome after ${trigger}`);
    }
  }
  writeGlobal(progressAddresses.gate!, 254);
  if (!currentObjective(gateJournal(""), "commission-gate").nextStep.includes("council clerk")) {
    throw new Error("The Stojanow Gate journal did not advance to reporting the capture");
  }
  writeGlobal(progressAddresses.gate!, 0);
  const ironBox = lines.find((line) => line.includes("ACROSS THE LOCK IS THE SEAL OF THE FAMILY OF CADORNA"))!;
  const boxLead = discoveredLeads(ironBox);
  const textileOffer = discoveredLeads(commissions.find(({ id }) => id === "textile")!.offer);
  const grishnakScript = blocks.find((block) => block.some(({ operands }) =>
    operands.some(({ text }) => text?.includes("I AM THE MIGHTY GRISHNAK"))));
  const grishnakLine = lines.find((line) => line.includes("I AM THE MIGHTY GRISHNAK"));
  const grishnakLoot = grishnakScript?.find(({ address, name }) => address === 0xa705 && name === "TREASURE");
  const grishnakWin = grishnakScript?.find(({ address, name }) => address === 0xa722 && name === "SAVE");
  if (!grishnakLine || grishnakLoot?.operands.at(-1)?.low !== 38 || grishnakWin?.operands[0]?.low !== 2 ||
      grishnakWin.operands[1]?.word !== 0x4a74) {
    throw new Error("Missing the original Grishnak treasure and completion records");
  }
  const treasure = parseDax("ITEM4.DAX", readGameFile(root, "ITEM4.DAX")).entries.find(({ id }) => id === 38);
  if (Buffer.from(treasure?.data.subarray(6 * 63 + 1, 6 * 63 + 10) ?? []).toString("ascii") !== "Brass Key") {
    throw new Error("The original Grishnak treasure does not contain the brass key");
  }
  const grishnakLeads = [...textileOffer, ...discoveredLeads(grishnakLine),
    ...discoveredLeads("YOU HAVE NO KEY TO UNLOCK THE PADLOCKS.")];
  for (const [state, instruction] of [[1, "Overcome Grishnak"], [2, "Check the loot from Grishnak's fight"]] as const) {
    writeGlobal(0x4a74, state);
    const objective = currentObjective([...grishnakLeads, ...questProgress(m, grishnakLeads, m.ds)], "commission-textile");
    if (!objective.nextStep.startsWith(instruction) ||
        questProgress(m, textileOffer, m.ds).some(({ id }) => id === "textile-grishnak-defeated")) {
      throw new Error(`The Journal did not follow Grishnak's temple state ${state}`);
    }
  }
  writeGlobal(0x4a74, 0);
  const textileAmbush = lines.find((line) => line.includes("A DRUM BEGINS TO BEAT AND HOBGOBLINS ATTACK"));
  if (!textileAmbush || textileOffer.some(({ id }) => id === "textile-courtyard-ambush") ||
      !currentObjective([...textileOffer, ...discoveredLeads(textileAmbush)], "commission-textile").nextStep.includes("Prepare for the hobgoblin ambush")) {
    throw new Error("The textile journal did not gate the courtyard warning on witnessed dialogue");
  }
  const quietCourtyard = lines.find((line) => line.includes("THE DRUM HAS FADED TO SILENCE"));
  if (!quietCourtyard ||
      !currentObjective([...textileOffer, ...discoveredLeads(textileAmbush + "\n" + quietCourtyard)],
        "commission-textile").nextStep.includes("Cross the quiet courtyard")) {
    throw new Error("The textile journal did not advance after the courtyard victory");
  }
  const skullcrusher = lines.find((line) => line.includes("MY NAME IS SKULLCRUSHER. THERE'S A SECRET DOOR"));
  if (!skullcrusher || currentObjective(textileOffer).nextStep.includes("secret door") ||
      !currentObjective([...textileOffer, ...discoveredLeads(skullcrusher)]).nextStep.includes("search southeast") ||
      !currentObjective(boxLead).nextStep.includes("Take It Unopened")) {
    throw new Error("Textile House journal clues did not follow the dialogue the party witnessed");
  }
  writeGlobal(textile, 0);
  const treasureProfile = openJournalProfile();
  treasureProfile(ironBox, (known) => questProgress(m, known, m.ds));
  let sealedSnapshot: JournalLead[] = [];
  for (const [box, hint] of [[1, "sealed box"], [128, "seal is broken"]] as const) {
    writeGlobal(0x4ac8, box);
    const live = treasureProfile("", (known) => questProgress(m, known, m.ds));
    if (box === 1) sealedSnapshot = live;
    if (!currentObjective(live, "commission-textile").nextStep.includes(hint) ||
        questProgress(m, [], m.ds).length) {
      throw new Error(`Cadorna's journal did not follow treasure state ${box}`);
    }
  }
  treasureProfile.restore(sealedSnapshot);
  writeGlobal(0x4ac8, 1);
  if (!currentObjective(treasureProfile("", (known) => questProgress(m, known, m.ds)),
    "commission-textile").nextStep.includes("sealed box")) {
    throw new Error("Restoring the earlier journal did not restore the sealed treasure objective");
  }
  writeGlobal(textile, 254);
  if (questProgress(m, boxLead, m.ds)[0]?.status !== "ready-to-report") {
    throw new Error("Cadorna's journal did not move on after the Watch handoff");
  }
  const confrontation = lines.find((line) => line.includes("COUNCILMAN CADORNA CONFRONTS YOU"));
  writeGlobal(textile, 255);
  const textileProgress = (known: JournalLead[]) => questProgress(m, known, m.ds);
  const textileCommission = (leads: JournalLead[]) => leads.find(({ id }) => id === "commission-textile");
  const beforeConfrontation = textileCommission(treasureProfile("", textileProgress));
  const afterConfrontation = confrontation && textileCommission(treasureProfile(confrontation, textileProgress));
  if (beforeConfrontation?.status !== "turned-in" || beforeConfrontation.rewardOutcome !== undefined ||
      !afterConfrontation || afterConfrontation.rewardOutcome !== "unpaid" || !afterConfrontation.title.includes("without payment")) {
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
  const graveyard = commissions.find(({ id }) => id === "graveyard")!;
  const graveyardOffer = lines.find(line => line.includes(graveyard.offer));
  if (!graveyardOffer) throw new Error("Missing graveyard commission dialogue");
  const graveyardStages = [
    ["A VAMPIRE WHO LURKS IN THE NORTHEAST CORNER", "northeast corner"],
    ["WOODEN STAIRS LEAD INTO A PIT", "choose Yes"],
    ["THE VAMPIRE TURNS INTO A VAPOR CLOUD", "where it fled"],
    ["THE VAMPIRE IS BEHIND THE NORTHERN WALL", "Search the northern wall"],
  ] as const;
  let graveyardTranscript = graveyardOffer;
  for (const [trigger, step] of graveyardStages) {
    const witnessed = lines.find(line => line.includes(trigger));
    if (!witnessed || currentObjective(discoveredLeads(graveyardTranscript), "commission-graveyard").nextStep.includes(step)) {
      throw new Error(`The graveyard journal revealed a clue before ${trigger}`);
    }
    graveyardTranscript += "\n" + witnessed;
    if (!currentObjective(discoveredLeads(graveyardTranscript), "commission-graveyard").nextStep.includes(step)) {
      throw new Error(`The graveyard journal did not update after ${trigger}`);
    }
  }
  writeGlobal(progressAddresses.graveyard!, 254);
  const graveyardProgress = questProgress(m, discoveredLeads(graveyardTranscript), m.ds);
  if (graveyardProgress.find(({ id }) => id === "commission-graveyard")?.status !== "ready-to-report" ||
      !currentObjective(graveyardProgress, "commission-graveyard").nextStep.includes("council clerk")) {
    throw new Error("The graveyard journal did not direct the party to report the cleared crypt");
  }
  if (questProgress(m, vampireLeads, m.ds).find(({ id }) => id === "commission-bottle-vampire")?.status !== "turned-in" ||
      questProgress(m, [], m.ds).some(({ id }) => id === "commission-bottle-vampire")) {
    throw new Error("The graveyard flag did not resolve the known bottle objective without revealing it");
  }
  const envoyOffer = lines.find(line => line.includes("A MESSAGE BE DELIVERED TO THE ZHENTIL OUTPOST TO THE WEST"));
  if (!envoyOffer) throw new Error("Missing the Zhentil envoy commission");
  const envoyStages = [
    ["DO NOT BREAK THE SEALS", "seals intact"],
    ["ARE YOU THE DIPLOMATIC ENVOYS FROM NEW PHLAN", "Answer Yes"],
    ["HE GREETS YOU AND YOU HAND HIM THE PAPERS", "commandant's tour"],
    ["HERE ARE YOUR QUARTERS", "assigned quarters"],
    ["WILL YOU WALK AROUND OR WILL YOU JUST RELAX UNTIL DINNER", "Choose Relax"],
    ["YOU ARRIVE AT THE OFFICERS MESS", "Speak with the commandant over dinner"],
    ["IT IS NIGHT AND YOU ARE IN YOUR QUARTERS", "Sleep With a Watch"],
    ["YOU ARE ATTACKED BY FOUR GUARDS IN YOUR SLEEP", "Get past the guards"],
    ["THE WALL IS CLIMBABLE HERE", "Choose Climb Over Wall"],
    ["YOU CLIMB OVER THE WALL AND LEAVE THE OUTPOST", "report the delivery"],
  ] as const;
  let envoyTranscript = envoyOffer;
  for (const [trigger, prompt] of envoyStages) {
    const witnessed = lines.find(line => line.includes(trigger));
    if (!witnessed || currentObjective(discoveredLeads(envoyTranscript), "commission-zhentil").nextStep.includes(prompt)) {
      throw new Error(`The Zhentil journal leaked a clue before ${trigger}`);
    }
    envoyTranscript += "\n" + witnessed;
    if (!currentObjective(discoveredLeads(envoyTranscript), "commission-zhentil").nextStep.includes(prompt)) {
      throw new Error(`The Zhentil journal missed the clue after ${trigger}`);
    }
  }
  const envoyFlag = progressAddresses.zhentil!;
  const envoyCommission = discoveredLeads(envoyOffer);
  writeGlobal(0x4a98, 255);
  writeGlobal(envoyFlag, 253);
  const envoyEscaped = questProgress(m, envoyCommission, m.ds);
  if (envoyEscaped.find(({ id }) => id === "commission-zhentil")?.status !== "accepted") {
    throw new Error("The Zhentil journal should await the overland transition before marking the reward ready");
  }
  writeGlobal(envoyFlag, 0);
  const riverOffer = commissions.find(({ id }) => id === "river")!.offer;
  const riverStages = [
    ["ROWBOAT HIDDEN AMOUNGST THE REEDS", "Take the rowboat"],
    ["YOU HAVE FOUND A SECRET DOOR THAT LEADS INTO THE PYRAMID", "through the secret door"],
    ["YOU HAVE ENTERED THE FOUNTAIN CHAMBER", "choose Destroy the Equipment"],
    ["NOT ALL THE EQUIPMENT IS YET DESTROYED", "choose Move Quickly Away"],
  ] as const;
  let riverTranscript = riverOffer;
  for (const [trigger, instruction] of riverStages) {
    const line = lines.find((text) => text.includes(trigger));
    if (!line || currentObjective(discoveredLeads(riverTranscript), "commission-river").nextStep.includes(instruction)) {
      throw new Error(`The river journal revealed a clue before ${trigger}`);
    }
    riverTranscript += "\n" + line;
    if (!currentObjective(discoveredLeads(riverTranscript), "commission-river").nextStep.includes(instruction)) {
      throw new Error(`The river journal missed the clue after ${trigger}`);
    }
  }
  for (const ending of ["YOU HAVE DESTROYED THE LAST PIECE OF EQUIPMENT", "THE EQUIPMENT IS NOW CERTAINLY DESTROYED",
    "BITS OF PIPE AND OTHER PLUMBING FIXTURES FLY IN ALL DIRECTIONS", "ALCHEMICAL POLLUTION CAUSED BY THE PYRAMID"]) {
    const line = lines.find((text) => text.includes(ending));
    if (!line || !currentObjective(discoveredLeads(riverTranscript + "\n" + line), "commission-river")
      .nextStep.includes("report the end of the river pollution")) {
      throw new Error(`The river journal missed the outcome after ${ending}`);
    }
  }
  const blast = lines.find((line) => line.includes("BITS OF PIPE AND OTHER PLUMBING FIXTURES FLY IN ALL DIRECTIONS"));
  const recovery = lines.find((line) => line.includes("THE LAND IS ALREADY BEGINNING TO RECOVER"));
  if (!blast || !recovery) throw new Error("Missing the original fountain blast or recovery dialogue");
  writeGlobal(progressAddresses.river!, 254);
  const riverObjective = (transcript: string) => {
    const known = discoveredLeads(transcript);
    return currentObjective([...questProgress(m, known, m.ds), ...known], "commission-river");
  };
  if (riverObjective(riverTranscript).nextStep.includes("blast") ||
      !riverObjective(`${riverTranscript}\n${blast}`).nextStep.includes("Check the party after the blast") ||
      riverObjective(`${riverTranscript}\n${blast}\n${recovery}`).nextStep.includes("blast")) {
    throw new Error("The river objective should respond to a witnessed blast until the party sees the land recovering");
  }
  const pumpingRoom = lines.find((line) => line.includes("YOU HAVE ENTERED A PUMPING ROOM"));
  const freedPrisoners = lines.find((line) => line.includes("AS YOU FREE THEM THEY TELL YOU ALL ABOUT WHAT YARASH IS DOING"));
  const hostilePrisoners = lines.find((line) => line.includes("THEY THROW THEIR BARRELS OF CONTAMINANT ON THE PARTY"));
  const swampOffer = commissions.find(({ id }) => id === "lizardmen")!.offer;
  if (!pumpingRoom || !freedPrisoners || !hostilePrisoners) throw new Error("Missing original pumping-room branches");
  const pumpingLeads = discoveredLeads(`${riverOffer}\n${swampOffer}\n${pumpingRoom}`);
  if (!currentObjective(pumpingLeads, "commission-river").nextStep.includes("Advance until Parlay appears") ||
      currentObjective(pumpingLeads, "commission-lizardmen").nextStep.includes("entry 35") ||
      !currentObjective([...pumpingLeads, ...discoveredLeads(freedPrisoners)], "commission-lizardmen").nextStep.includes("entry 35") ||
      currentObjective([...pumpingLeads, ...discoveredLeads(hostilePrisoners)], "commission-river").nextStep.includes("Advance until Parlay appears")) {
    throw new Error("The pumping-room branches should update only the choices and clues the party has witnessed");
  }
  const swampStages = [
    ["AN OLD LIZARDMAN APPEARS BEFORE YOU", "Parlay with the elder"],
    ["YOU WILL HAVE BEEN SHOWN OUR TRIBAL FRIEND-WORD", "give the tribal friend-word"],
    ["THE OLD LIZARD MAN RECOGNIZES THE WORD", "Read journal entry 31"],
    ["OUR CAUSE IS ONE. WILL YOU CHAMPION ME", "choose a party member"],
    ["MY PEOPLE WILL NOT JOIN TYRANTHRAXUS", "report his pledge"],
  ] as const;
  const rescueOffer = commissions.find(({ id }) => id === "rescue")!.offer;
  const rescueStages = [
    ["SLAVERS RIDE BY YOU TOWARD THE BUCCANEER BASE", "Follow the slavers"],
    ["YOU HAVE REACHED THE BUCCANEER BASE", "find the pen"],
    ["YOU SEE A BOY THAT HAS A HEART-SHAPED BIRTHMARK", "Choose Rescue Boy"],
    ["YOU IGNORE THE SLEAZY MERCHANT AND CONCENTRATE ON RESCUING THE BOY", "Choose Sneak Into Pen"],
    ["YOU ARE IN THE SLAVE PEN. STANDING NEAR YOU IS THE YOUNG BOY", "Choose Get Him"],
  ] as const;
  let rescueTranscript = rescueOffer;
  for (const [trigger, instruction] of rescueStages) {
    const line = lines.find((text) => text.replace(/\s+/g, " ").includes(trigger));
    if (!line || currentObjective(discoveredLeads(rescueTranscript), "commission-rescue").nextStep.includes(instruction)) {
      throw new Error(`The rescue journal revealed a clue before ${trigger}`);
    }
    rescueTranscript += "\n" + line;
    if (!currentObjective(discoveredLeads(rescueTranscript), "commission-rescue").nextStep.includes(instruction)) {
      throw new Error(`The rescue journal missed the clue after ${trigger}`);
    }
  }
  const rescueLost = lines.find((line) => line.includes("THE YOUNG BOY COULD NOT KEEP UP AND WAS LEFT BEHIND"));
  const escapeGuards = lines.find((line) => line.includes("SOME OF THE GUARDS SPOT YOU WITH THE BOY"));
  if (!escapeGuards) throw new Error("Missing the original guard interception dialogue");
  const escapingRescue = discoveredLeads(`${rescueTranscript}\n${escapeGuards}`);
  writeGlobal(progressAddresses.rescue!, 254);
  writeGlobal(0x49f2, 1);
  const escortProgress = questProgress(m, escapingRescue, m.ds);
  if (escortProgress.find(({ id }) => id === "commission-rescue")?.status !== "accepted" ||
      !currentObjective([...escortProgress, ...escapingRescue], "commission-rescue").nextStep.includes("Fight off the guards")) {
    throw new Error("The rescue journal sent the party to the council before leaving the base");
  }
  writeGlobal(0x49f2, 25);
  if (questProgress(m, escapingRescue, m.ds).find(({ id }) => id === "commission-rescue")?.status !== "ready-to-report") {
    throw new Error("The rescue journal did not recognize an escaped party");
  }
  if (!rescueLost) throw new Error("Missing the original lost-heir dialogue");
  const failedRescue = discoveredLeads(`${rescueTranscript}\n${rescueLost}`);
  writeGlobal(progressAddresses.rescue!, 128);
  if (!currentObjective(questProgress(m, failedRescue, m.ds), "commission-rescue").nextStep.includes("what happened to the boy")) {
    throw new Error("The journal did not distinguish reporting a failed rescue");
  }
  writeGlobal(progressAddresses.rescue!, 255);
  if (questProgress(m, failedRescue, m.ds).find(({ id }) => id === "commission-rescue")?.rewardOutcome !== "unpaid") {
    throw new Error("The journal treated the failed rescue as paid after reporting it");
  }
  let swampTranscript = `${swampOffer}\n${freedPrisoners}`;
  for (const [trigger, instruction] of swampStages) {
    const line = lines.find((text) => text.includes(trigger));
    if (!line || currentObjective(discoveredLeads(swampTranscript), "commission-lizardmen").nextStep.includes(instruction)) {
      throw new Error(`The swamp journal revealed a clue before ${trigger}`);
    }
    swampTranscript += "\n" + line;
    if (!currentObjective(discoveredLeads(swampTranscript), "commission-lizardmen").nextStep.includes(instruction)) {
      throw new Error(`The swamp journal missed the clue after ${trigger}`);
    }
  }
  const rejectedWord = lines.find((line) => line.includes("YOU ARE NOT THEY WHO RESCUED MY CHILDREN"));
  const challenge = lines.find((line) => line.includes("OUR CAUSE IS ONE. WILL YOU CHAMPION ME"));
  const declinedChallenge = lines.find((line) => line.includes("THEN I MUST FIGHT HIM MYSELF"));
  if (!rejectedWord || !challenge || !declinedChallenge ||
      !currentObjective(discoveredLeads(`${swampOffer}\n${rejectedWord}`), "commission-lizardmen").nextStep.includes("peaceful meeting ended") ||
      !currentObjective(discoveredLeads(`${swampOffer}\n${challenge}\n${declinedChallenge}`), "commission-lizardmen").nextStep.includes("peaceful meeting ended")) {
    throw new Error("The swamp journal kept offering peaceful choices after the meeting ended");
  }
  const acceptance = [["graveyard", 0x4a96, 255], ["auction", progressAddresses.auction!, 1], ["textile", 0x4a97, 255], ["zhentil", 0x4a98, 255],
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
    ["A LOUD COMMOTION RISES FROM THE COURTYARD", "ready weapons and spells"],
    ["ON A HOBGOBLIN BODY, YOU FIND A NOTE", "Read journal entry 57"],
    ["THIS WAS ONCE THE CHAPEL OF THE KEEP", "go around it to the east"],
    ["A PALE FORM RISES BEFORE YOU", "Talk to the pale form"],
    ["I AM THE LIFE FORM OF FERRAN MARTINEZ", "answer him truthfully"],
    ["TO PASS MY GUARDS ON THE WAY OUT", "answer him truthfully"],
  ];
  const hauntOffer = discoveredLeads(commissions.find(({ id }) => id === "sokal")!.offer);
  const floorboard = lines.find((line) => line.includes("HE POINTS TO A FLOORBOARD"));
  const diary = lines.find((line) => line.includes("BENEATH A FLOORBOARD YOU FIND SOME GEMS"));
  if (!floorboard || !diary || currentObjective(hauntOffer).nextStep.includes("floorboard") ||
      !currentObjective([...hauntOffer, ...discoveredLeads(floorboard)]).nextStep.includes("Check the floorboard") ||
      !currentObjective([...hauntOffer, ...discoveredLeads(`${floorboard}\n${diary}`)]).nextStep.includes("Read journal entry 3")) {
    throw new Error("The Sokal journal did not follow the defenders' diary discoveries");
  }
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
    if (trigger === "A LOUD COMMOTION RISES FROM THE COURTYARD") {
      const welcome = lines.find((line) => line.includes("THE PRIESTS OF TYR WELCOME YOU TO THE TEMPLE"));
      const healing = lines.find((line) => line.includes("DO YOU SEEK HEALING?"));
      if (!welcome || !healing || currentObjective(leads).nextStep.includes("Temple of Tyr") ||
          !currentObjective(discoveredLeads(`${transcript}\n${welcome}\n${healing}`)).nextStep.includes("Temple of Tyr")) {
        throw new Error("Sokal temple guidance must depend on hearing the priests' offer");
      }
      const recruitment = lines.find((dialogue) => dialogue.includes("DO YOU SEEK A PARTNER FOR YOUR ADVENTURING"));
      if (!recruitment || currentObjective(leads).nextStep.includes("arena master") ||
          !currentObjective(discoveredLeads(transcript + "\n" + recruitment)).nextStep.includes("arena master")) {
        throw new Error("Sokal recruitment guidance must depend on hearing the arena master's offer");
      }
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
