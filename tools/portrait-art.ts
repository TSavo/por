import { parseDax } from "../src/lib/dax.js";
import type { Frame } from "../src/lib/ega.js";
import { decodePicture, frameSlice, pictureMembers } from "../src/lib/picture.js";
import { findGameRoot, listGameFiles, readGameFile } from "./gamedata.js";

const pictureKey = /^portrait:(PIC\d+\.DAX):(\d{1,3}):(\d{1,3}):(\d{1,3})$/;
const roamingZombieAnimationKey = /^portrait:area:10:ecl:(?:b56c|b58c):PIC4\.DAX:35:0:0$/;
export const compositePortraitKey = /^portrait:(?:area:\d{1,3}:(?:ecl:[a-f0-9]{4}:(?:caller:[a-f0-9]{4}:)?)?)?(HEAD\d+\.DAX):(\d{1,3}):(BODY\d+\.DAX):(\d{1,3})$/;
export const portraitKey = /^portrait:(?:area:\d{1,3}:(?:ecl:[a-f0-9]{4}:(?:caller:[a-f0-9]{4}:)?)?)?(?:PIC\d+\.DAX:\d{1,3}:\d{1,3}:\d{1,3}|HEAD\d+\.DAX:\d{1,3}:BODY\d+\.DAX:\d{1,3})$/;
export const characterSheetPartKey = /^character-sheet:((HEAD|BODY)[1-8]\.DAX):(\d{1,3})$/;
export const scriptIllustrations = new Map<string, string | RegExp>([
  ["scene-illustration:area:8:ecl:9f3f:caller:9a4a:cue:council-victory-award", "EACHCHARACTERRECEIVES67500EXPERIENCEPOINTS"],
  ["scene-illustration:area:9:ecl:a977", "NOWBEATITBEFOREWEGETSERIOUS"],
  ["scene-illustration:area:9:ecl:a0a7:cue:bugbear-dismissal", "NOWBEATITBEFOREWEGETSERIOUS"],
  ["scene-illustration:area:10:ecl:b6c6:caller:b353", "YOUFINDTHEVAMPIRE'STREASURETROVE"],
  ["scene-illustration:area:13:ecl:af3c:caller:b137", "THEKOBOLDPAUSES,IDLYTAPSTHEWALL"],
  ["scene-illustration:area:13:ecl:af5e:caller:b137", "THEKOBOLDPAUSES,IDLYTAPSTHEWALL"],
  ["scene-illustration:area:13:ecl:afbe:caller:b153", "THEKOBOLDPAUSES,IDLYTAPSTHEWALL"],
  ["scene-illustration:area:13:ecl:b511:caller:afc2", "THEKOBOLDPAUSES,IDLYTAPSTHEWALL"],
  ["scene-illustration:area:13:ecl:b1db:caller:b153", "THEENVOYSAREHERE,GREATKING"],
  ["scene-illustration:area:13:ecl:b1dc", "THEENVOYSAREHERE,GREATKING"],
  ["scene-illustration:area:13:ecl:a81b", "SHEOFFERSTOJOINYOURBAND"],
  ["scene-illustration:area:13:ecl:a838", "SHEOFFERSTOJOINYOURBAND"],
  ["scene-illustration:area:13:ecl:a8cb", "SOISHALLCUTMYOWNWAYOUT"],
  ["scene-illustration:area:13:ecl:a8d8", "SOISHALLCUTMYOWNWAYOUT"],
  ["scene-illustration:area:0:ecl:9b38", "COUNCILMANCADORNACONFRONTSYOU"],
  ["scene-illustration:area:2:ecl:abae", "YOUFINDAPAGEFROMADIARY"],
  ["scene-illustration:area:2:ecl:ac4b", "ONTHEWELLISANOTE,'THIEVESONLY"],
  ["scene-illustration:area:2:ecl:ac61", "ONTHEWELLISANOTE,'THIEVESONLY"],
  ["scene-illustration:area:2:ecl:a980", "YOUFINDANIRONBOX"],
  ["scene-illustration:area:2:ecl:a99c", "ISTHESEALOFTHEFAMILYOFCADORNA"],
  ["scene-illustration:area:2:ecl:b09b", "YOUAREBLINDFOLDEDANDTAKENONALONG"],
  ["scene-illustration:area:2:ecl:b0be", "YOUAREBLINDFOLDEDANDTAKENONALONG"],
  ["scene-illustration:area:7:ecl:995f:caller:a8b2", "YOULEAVETHECASTLE.MOVINGTHROUGHTHESTREETS"],
  ["scene-illustration:area:7:ecl:a82d", /THESPIRITOFTYRANTHRAXUSFLARESUP|YOUHAVEBUTSLAINTHEBODYIPOSSESSED|NOLORDBANE!ICANSTILLRULEHERE/],
  ["scene-illustration:area:4:ecl:9a5a:caller:b00a", "THEREDWIZARDSOFTHAYAREALLIEDTOTYRANTHRAXUS"],
  ["scene-illustration:area:4:ecl:b006", "YOUFINDEVIDENCETHATTHEREDWIZARDSOFTHAY"],
  ["scene-illustration:area:4:ecl:b102", "HISULTIMATEGOALISTOCONQUERALLLANDS"],
  ["scene-illustration:area:4:ecl:9a5a:caller:b106", "HISULTIMATEGOALISTOCONQUERALLLANDSSOUTHOFTHEMOONSEA"],
  ["scene-illustration:area:4:ecl:a93a", "HETAKESASLIPOFPAPERFROMTHEPOUCHOFTHEDEADGNOLL"],
  ["scene-illustration:area:4:ecl:9a5a:caller:a93e", "HERE,YOUWILLNEEDTHIS"],
  ["scene-illustration:area:4:ecl:af2b", "YOUFINDAREPORTINDICATINGTHATTHENORTHERNBARBARIANS"],
  ["scene-illustration:area:4:ecl:9a5a:caller:af2f", "THECHIEFOFTHERAVENCLANISALLIEDTOTYRANTHRAXUS"],
  ["scene-illustration:area:4:ecl:ae7e", "THEFOLLOWINGCATCHESYOUREYE"],
  ["scene-illustration:area:4:ecl:ae8e", "THEFOLLOWINGCATCHESYOUREYE"],
  ["scene-illustration:area:4:ecl:9a5a:caller:ae92", "FORYOUSHALLKNOWMEBYMYFLAMINGAURA"],
  ["scene-illustration:area:15:ecl:99b5:caller:9962", "YOUFINDLEXGEOGRAPHICA"],
  ["scene-illustration:area:15:ecl:99b5:caller:9962:cue:grand-historian", "YOUFINDTHEGRANDHISTORIAN"],
  ["scene-illustration:area:15:ecl:99b5:caller:9962:cue:history-of-the-north", "YOUFINDTHEHISTORYOFTHENORTH"],
  ["scene-illustration:area:16:ecl:9a87:caller:a287", "YOURTIMEISTHROUGHOLDONE"],
  ["scene-illustration:area:16:ecl:9a59:caller:a2ee", "WILLYOUCHAMPIONME"],
  ["scene-illustration:area:16:ecl:9a87:caller:a502", "THECOMBATISEXTREMELYSHORTINDURATION"],
  ["scene-illustration:area:17:ecl:a70d", "YOUARETREATEDASHONOREDGUESTS"],
  ["scene-illustration:area:17:ecl:9da2:caller:a711", "THEREARECONTESTSOFSTRENGTHANDSKILLINYOURHONOR"],
  ["scene-illustration:area:17:ecl:a79e", "THENOMADSBUILDAHUGECAMPFIRE"],
  ["scene-illustration:area:17:ecl:9da2:caller:a7a2", "THEWHOLETRIBEGATHERSFORTHEFEAST"],
  ["scene-illustration:area:18:ecl:a608", "GARWIN,I'LLGETYOU"],
  ["scene-illustration:area:18:ecl:b240:caller:a839", "THEMANHASESCAPEDINTHECONFUSION"],
  ["scene-illustration:area:18:ecl:b240:caller:aa1e", "THEBATTLEISOVER,THEPATRONSRETURNTODRINKING"],
  ["scene-illustration:area:19:ecl:aeeb:cue:diogenes-bottle-departure", "AFTERSPEAKINGDIOGENESFLIESTHROUGHAHOLE"],
  ["scene-illustration:area:19:ecl:aeeb:cue:diogenes-advice-departure", "AFTERSPEAKING,THEDRAGONFLYSTHROUGHANOPENNING"],
  ["scene-illustration:area:8:ecl:9f21:caller:9a4a", "WITHSOKALKEEPINOURHANDS"],
  ["scene-illustration:area:8:ecl:9f21:caller:9a4a:cue:bivant-rescue", "BIVANTWASDELIGHTEDWITHTHECHILD"],
  ["scene-illustration:area:8:ecl:9f21:caller:9a4a:cue:lex-geographica", /THESEMAPSSHOULDHELPUS(?:TO)?LOCATE/],
  ["scene-illustration:area:8:ecl:9f21:caller:9a4a:cue:stojonow-river", "CLEARINGOFTHESTOJONOWRIVER"],
  ["scene-illustration:area:8:ecl:9f21:caller:9a4a:cue:nomad-camp", "WEWEREMUCHRELIEVEDBYTHENEWSYOUBRINGFROMTHENOMADCAMP"],
  ["scene-illustration:area:8:ecl:9f21:caller:9a4a:cue:zhentil-envoy", "CADORNAWASWAGERINGYOURRETURN"],
  ["scene-illustration:area:8:ecl:9f21:caller:9a4a:cue:lizardmen", "LIZARDMENMENACEHASGREATLYIMPROVED"],
  ["scene-illustration:area:8:ecl:9f21:caller:9a4a:cue:kobold-king", "THISLOSSOFTHEKOBOLDFORCESWILLBEAMAJORBLOW"],
  ["scene-illustration:area:8:ecl:b5c3:caller:a51f", "YOUMAYKEEPALLYOUFOUNDINTHETEMPLEOFBANE"],
  ["scene-illustration:area:9:ecl:a85c", "AVOICEFROMTHETOWERYELLS"],
  ["scene-illustration:area:9:ecl:a863", "STAYAWAYFROMTHEWALL"],
  ["scene-illustration:area:26:ecl:9c23", "FIERCEGUSTSOFWINDHOWLPAST"],
  ["scene-illustration:area:26:ecl:b695:caller:9c27", "THESWIRLINGMURKHIDESWHATLIESAHEAD"],
  ["scene-illustration:area:26:ecl:9c8f", "EXPLOSIONOFLIGHTNINGREVEALS"],
  ["scene-illustration:area:26:ecl:9c99", "EXPLOSIONOFLIGHTNINGREVEALS"],
  ["scene-illustration:area:14:ecl:afeb", "YOUFINDSOMEIMPORTANTLOOKINGFILES"],
  ["scene-illustration:area:14:ecl:afec", "YOUFINDSOMEIMPORTANTLOOKINGFILES"],
  ["scene-illustration:area:14:ecl:b359:cue:guild-files", "YOUFINDSOMEIMPORTANTLOOKINGFILES"],
  ["scene-illustration:area:14:ecl:acbc", "TWOTHIEVESCOMEOUTOFNOWHEREANDATTACKTHEPARTY"],
  ["scene-illustration:area:14:ecl:accb", "TWOTHIEVESCOMEOUTOFNOWHEREANDATTACKTHEPARTY"],
  ["scene-illustration:area:14:ecl:ad8f", "THETWOTHIEVESSPLIT;ONEGOINGTHROUGHTHEEASTDOOR"],
  ["scene-illustration:area:14:ecl:adab", "THETWOTHIEVESSPLIT;ONEGOINGTHROUGHTHEEASTDOOR"],
  ["scene-illustration:area:14:ecl:ae59", "YOUHAVECAUGHTONEOFTHETHIEVES"],
  ["scene-illustration:area:14:ecl:ae6e", "YOUHAVECAUGHTONEOFTHETHIEVES"],
  ["scene-illustration:area:14:ecl:aef2", "AFTERYOURELEASEHIMTHETHIEFSLOWLYWALKSTOWARDTHEFARDOOR"],
  ["scene-illustration:area:14:ecl:b359:cue:guildmaster-escape", "AFTERYOURELEASEHIMTHETHIEFSLOWLYWALKSTOWARDTHEFARDOOR"],
  ["scene-illustration:area:14:ecl:b2d4", "ONTHEFLOORISACRUDEMAP"],
  ["scene-illustration:area:14:ecl:b2d5", "ONTHEFLOORISACRUDEMAP"],
  ["scene-illustration:area:14:ecl:b359:cue:castle-map-ne", "ONTHEFLOORISACRUDEMAP"],
  ["scene-illustration:area:14:ecl:b239", "ONANEARBYWALLISASLATE.DRAWNONTHESLATEISACOMPLEXMAZEWITHTHEWORDS'NWCASTLE'UNDERIT"],
  ["scene-illustration:area:14:ecl:b23a", "ONANEARBYWALLISASLATE.DRAWNONTHESLATEISACOMPLEXMAZEWITHTHEWORDS'NWCASTLE'UNDERIT"],
  ["scene-illustration:area:14:ecl:b359:cue:castle-map-nw", "ONANEARBYWALLISASLATE.DRAWNONTHESLATEISACOMPLEXMAZEWITHTHEWORDS'NWCASTLE'UNDERIT"],
  ["scene-illustration:area:21:ecl:9ec8", "THEUNDEADLEAVE"],
  ["scene-illustration:area:21:ecl:9ecc", "THEUNDEADLEAVE"],
  ["scene-illustration:area:21:ecl:ac46", "THECITYFELLLONGAGO"],
  ["scene-illustration:area:21:ecl:ae31:caller:ac4a", "THECITYFELLLONGAGO"],
  ["scene-illustration:area:21:ecl:acdf", "THESAGEMENDORWORKEDHARDTOGATHER"],
  ["scene-illustration:area:21:ecl:ae31:caller:ace3", "THESAGEMENDORWORKEDHARDTOGATHER"],
  ["scene-illustration:area:21:ecl:ae31:caller:a573", "BENEATHAFLOORBOARDYOUFINDSOMEGEMS"],
  ["scene-illustration:area:21:ecl:ae41:caller:a92a", "ONSTANDSAREASHIELD"],
  ["scene-illustration:area:21:ecl:a872", "PASSINGTHROUGHANILLUSIONARYWALL"],
  ["scene-illustration:area:22:ecl:9a06:caller:9f51", "YOUFINDTHECORPSEOFAMAN"],
  ["scene-illustration:area:22:ecl:9a06:caller:9fe3", "ITISTHEJOURNALOFTYRMOR"],
  ["scene-illustration:area:22:ecl:9aee:caller:9ac5", "ASECRETDOORISFOUNDINFRONTOFYOU"],
  ["scene-illustration:area:22:ecl:9a06:caller:9c5c", "ASECRETDOORISFOUNDINFRONTOFYOU"],
  ["scene-illustration:area:22:ecl:9b1a:caller:9ac5", "ASECRETDOORISFOUNDTOYOURLEFT"],
  ["scene-illustration:area:22:ecl:9a06:caller:9c5c:cue:left", "ASECRETDOORISFOUNDTOYOURLEFT"],
  ["scene-illustration:area:23:ecl:9a04:caller:ade9", "AMONGTHEPAPERSONTHEDESK"],
  ["scene-illustration:area:23:ecl:9a04:caller:ae21", "ALETTERFROMTHEBOSS"],
  ["scene-illustration:area:23:ecl:9a04:caller:ae48", "ANUNSENTREPLYTOTHISLETTER"],
  ["scene-illustration:area:23:ecl:9a04:caller:ae89", "AMESSAGETOTHEBUCCANEERS"],
  ["scene-illustration:area:23:ecl:9a04:caller:aed0", "AWARNINGTOANAGENT"],
  ["scene-illustration:area:23:ecl:9a04:caller:af04", "ANOTETOATRAPPER"],
  ["scene-illustration:area:23:ecl:9a04:caller:a855", "YOUHEARANENORMOUSEXPLOSION"],
  ["scene-illustration:area:23:ecl:aaaa", "ASYOUFREETHEMTHEYTELLYOU"],
  ["scene-illustration:area:23:ecl:9a04:caller:aaae", "ASYOUFREETHEMTHEYTELLYOU"],
  ["scene-illustration:area:25:ecl:9d48:caller:9af6", "HEREYOUSEEONEOFOURFINEBARRACKS"],
  ["scene-illustration:area:25:ecl:b624:caller:9d4d", "HEREYOUSEEONEOFOURFINEBARRACKS"],
  ["scene-illustration:area:25:ecl:9da3:caller:9af6", "HEREYOUSEEONEOFOURFINEWATCHTOWERS"],
  ["scene-illustration:area:25:ecl:b624:caller:9da7", "HEREYOUSEEONEOFOURFINEWATCHTOWERS"],
  ["scene-illustration:area:25:ecl:9e0a:caller:9af6", "SOLIDLYBUILTOUTSIDEWALL"],
  ["scene-illustration:area:25:ecl:b624:caller:9e0e", "SOLIDLYBUILTOUTSIDEWALL"],
  ["scene-illustration:area:25:ecl:9e98:caller:9af6", "HEREAREYOURQUARTERS"],
  ["scene-illustration:area:25:ecl:b5ec", "HEREAREYOURQUARTERS.DONOTLEAVETHISAREA"],
  ["scene-illustration:area:25:ecl:a448", "ASYOUENTERTHECAVEYOUAREGREETEDBYDIOGENES"],
  ["scene-illustration:area:25:ecl:a58b:caller:a44c", "ISEEYOUHAVERECOVEREDTHESILVERBOTTLE"],
  ["scene-illustration:area:25:ecl:a4c8", "THATBOTTLECONTAINSAPOWERFULEFREET"],
  ["scene-illustration:area:25:ecl:a58b:caller:a4cc", "THATBOTTLECONTAINSAPOWERFULEFREET"],
  ["scene-illustration:area:25:ecl:a558:cue:diogenes-flight", "AFTERSPEAKINGDIOGENESFLIESTHROUGHAHOLE"],
  ["scene-illustration:area:25:ecl:a558", "WHENYOUMEETTHEVAMPIREUSETHEBOTTLE"],
  ["scene-illustration:area:25:ecl:9c70", "AFTERSPEAKING,THEDRAGONFLYSTHROUGHANOPENNING"],
  ["scene-illustration:area:26:ecl:9f65", "YOUHAVEFOUNDAROWBOATHIDDEN"],
  ["scene-illustration:area:26:ecl:9f74", "YOUHAVEFOUNDAROWBOATHIDDEN"],
  ["scene-illustration:area:31:ecl:b0b5", "YOUFINDAPIECEOFPAPERONTHEFLOORINTHEROOM.YOUPLACEITINYOURJOURNALUNDERENTRY53"],
]);
export function matchScriptIllustration(context: string, dialogue: string, installed: readonly string[]) {
  for (const [id, cue] of scriptIllustrations) {
    if (id !== context && !id.startsWith(context + ":cue:")) continue;
    const matches = typeof cue === "string" ? dialogue.includes(cue) : cue.test(dialogue);
    if (matches && installed.includes(id)) return id;
  }
}

const areaPortraitKey = /^portrait:area:(\d+):(?:ecl:([a-f0-9]{4}):(?:caller:([a-f0-9]{4}):)?)?/;
const left = 24;
const top = 24;
const size = 88;
const headHeight = 40;
export type CharacterSheetPart = [x: number, y: number, key: string, width: number, height: number];

export function characterSheetPartPixels(data: Uint8Array, part: string) {
  const height = part === "HEAD" ? headHeight : size - headHeight;
  const picture = decodePicture(data);
  if (picture.width === size && picture.height === height && picture.itemCount === 1) {
    return frameSlice(picture, 0);
  }
}

export function loadCharacterSheetArt(keys: string[], root = keys.length ? findGameRoot() : null) {
  const files = new Map(root ? listGameFiles(root).map(file => [file.toUpperCase(), file]) : []);
  const archives = new Map<string, ReturnType<typeof parseDax>>();
  const parts = new Map<string, string | null>();
  for (const key of keys) {
    const match = characterSheetPartKey.exec(key);
    const file = match && files.get(match[1]!);
    if (!root || !match || !file) continue;
    let archive = archives.get(file);
    if (!archive) {
      archive = parseDax(file, readGameFile(root, file));
      archives.set(file, archive);
    }
    const entry = archive.entries.find(({ id }) => id === Number(match[3]));
    const pixels = entry && characterSheetPartPixels(entry.data, match[2]!);
    if (!pixels?.some(Boolean)) continue;
    const signature = Buffer.from(pixels).toString("base64");
    parts.set(signature, parts.has(signature) ? null : key);
  }
  return (screen: Frame): CharacterSheetPart[] | undefined => {
    if (!parts.size || screen.get(216, 0) !== 14 || screen.get(312, 0) !== 14 ||
        screen.get(216, 96) !== 14 || screen.get(312, 96) !== 14) return;
    const placements: CharacterSheetPart[] = [];
    for (const [top, height] of [[8, headHeight], [48, size - headHeight]] as const) {
      const source = Buffer.alloc(size * height);
      for (let row = 0; row < height; row++) {
        const offset = (top + row) * screen.width + 224;
        source.set(screen.pixels.subarray(offset, offset + size), row * size);
      }
      const key = parts.get(source.toString("base64"));
      if (!key) return;
      placements.push([224, top, key, size, height]);
    }
    return placements;
  };
}

export function loadPortraitArt(keys: string[], includeClassic = false,
  root = keys.length || includeClassic ? findGameRoot() : null,
  report?: (id: string, reason: string) => void) {
  const files = new Map(root ? listGameFiles(root).map((file) => [file.toUpperCase(), file]) : []);
  const patterns = new Map<string, string | null>();
  const registered = new Map<string, string[]>();
  const classicSources = new Map<string, string[]>();
  const classicHeads = new Map<string, string[]>();
  const classicBodies = new Map<string, string[]>();
  const archiveCache = new Map<string, ReturnType<typeof parseDax>>();
  function entry(archive: string, id: string) {
    const file = files.get(archive);
    if (!root || !file) return;
    return archiveData(file).entries.find(block => block.id === Number(id));
  }
  function archiveData(file: string) {
    let data = archiveCache.get(file);
    if (!data) {
      data = parseDax(file, readGameFile(root!, file));
      archiveCache.set(file, data);
    }
    return data;
  }
  function register(pixels: Uint8Array, key: string) {
    if (!pixels.some(Boolean)) return;
    const [, area, cursor, caller] = areaPortraitKey.exec(key) ?? [];
    const scope = [area, cursor, caller].flatMap(part => part === undefined ? [] : [part + ":"]).join("");
    const signature = scope + Buffer.from(pixels).toString("base64");
    if (patterns.get(signature) === key) return;
    patterns.set(signature, patterns.has(signature) ? null : key);
    if (report) {
      const ids = registered.get(signature) ?? [];
      ids.push(key);
      registered.set(signature, ids);
    }
  }
  for (const key of keys) {
    const composite = compositePortraitKey.exec(key);
    if (composite) {
      const [, headArchive, headId, bodyArchive, bodyId] = composite;
      const head = entry(headArchive, headId);
      const body = entry(bodyArchive, bodyId);
      if (!head || !body) continue;
      const [top, bottom] = [head, body].map(part => decodePicture(part.data));
      if (top.width !== size || bottom.width !== size || top.height !== headHeight || bottom.height !== size - headHeight ||
          top.itemCount !== 1 || bottom.itemCount !== 1) continue;
      register(Buffer.concat([frameSlice(top, 0), frameSlice(bottom, 0)]), key);
      continue;
    }
    const match = pictureKey.exec(key.replace(areaPortraitKey, "portrait:"));
    if (!match) continue;
    const [, archive, block, member, frame] = match;
    const source = entry(archive, block);
    const members = source ? pictureMembers(source.data) : [];
    const record = members[Number(member)];
    if (!record) continue;
    const picture = decodePicture(record.data);
    if (picture.width !== size || picture.height !== size || Number(frame) >= picture.itemCount) continue;
    const base = frameSlice(picture, Number(frame));
    register(base, key);
    if (roamingZombieAnimationKey.test(key) && record.selector === 1) {
      // The guest XORs one animation delta onto the base portrait.
      for (const member of members.slice(1)) {
        if (member.selector !== record.selector) continue;
        const delta = decodePicture(member.data);
        if (delta.width !== size || delta.height !== size || delta.itemCount !== 1) continue;
        register(base.map((pixel, index) => pixel ^ delta.pixels[index]!), key);
      }
    }
  }
  if (report) {
    const matched = new Set([...registered.values()].flat());
    for (const key of keys) {
      if (!matched.has(key)) report(key, "No usable 88×88 original portrait frame for this ID.");
    }
    for (const ids of registered.values()) {
      if (ids.length < 2) continue;
      for (const id of ids) report(id, "Ambiguous original portrait in the same scope: " + ids.filter(other => other !== id).join(", "));
    }
  }
  if (includeClassic) {
    for (const [name, file] of files) {
      if (/^(?:HEAD|BODY)\d+\.DAX$/.test(name)) {
        const head = name.startsWith("HEAD");
        const parts = head ? classicHeads : classicBodies;
        for (const { id, data } of archiveData(file).entries) {
          const picture = decodePicture(data);
          if (picture.width !== size || picture.height !== (head ? headHeight : size - headHeight) ||
              picture.itemCount !== 1 || picture.pixels.every(color => color === picture.pixels[0])) continue;
          const signature = Buffer.from(picture.pixels).toString("base64");
          const matches = parts.get(signature) ?? [];
          matches.push(`${name}:${id}`);
          parts.set(signature, matches);
        }
        continue;
      }
      if (!/^PIC\d+\.DAX$/.test(name)) continue;
      for (const { id, data } of archiveData(file).entries) {
        for (const [memberIndex, member] of pictureMembers(data).entries()) {
          const picture = decodePicture(member.data);
          if (picture.width !== size || picture.height !== size) continue;
          for (let frame = 0; frame < picture.itemCount; frame++) {
            const pixels = frameSlice(picture, frame);
            // Solid-color records are placeholders, and can also match a
            // cleared perspective pane in the original menus.
            if (pixels.every((color) => color === pixels[0])) continue;
            const signature = Buffer.from(pixels).toString("base64");
            const sources = classicSources.get(signature) ?? [];
            sources.push(`portrait:${name}:${id}:${memberIndex}:${frame}`);
            classicSources.set(signature, sources);
          }
        }
      }
    }
  }
  return (screen: Frame, area?: number, cursor?: number, caller?: number) => {
    if (!patterns.size && !classicSources.size && !classicHeads.size) return;
    const pixels = Buffer.alloc(size * size);
    for (let y = 0; y < size; y++) {
      const offset = (top + y) * screen.width + left;
      pixels.set(screen.pixels.subarray(offset, offset + size), y * size);
    }
    const signature = pixels.toString("base64");
    let match: string | null | undefined;
    if (area !== undefined && cursor !== undefined) {
      const scope = `${area}:${cursor.toString(16).padStart(4, "0")}:`;
      if (caller !== undefined) match = patterns.get(`${scope}${caller.toString(16).padStart(4, "0")}:${signature}`);
      if (match === undefined) match = patterns.get(scope + signature);
    }
    if (match === undefined && area !== undefined) match = patterns.get(`${area}:${signature}`);
    if (match === undefined) match = patterns.get(signature);
    if (typeof match === "string") return match;
    const sources = classicSources.get(signature);
    if (sources) return sources;
    const heads = classicHeads.get(pixels.subarray(0, size * headHeight).toString("base64"));
    const bodies = classicBodies.get(pixels.subarray(size * headHeight).toString("base64"));
    if (heads && bodies) return heads.flatMap(head => bodies.map(body => `portrait:${head}:${body}`));
    if (match === null) return [];
  };
}
