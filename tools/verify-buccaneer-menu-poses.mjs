import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { openChromeCampaignLeg } from "./chrome-campaign-replay.mjs";

const [chromePath, root, member] = process.argv.slice(2);
assert.ok(chromePath && root && /^[0-4]$/.test(member), "Pass Chrome, the output directory, and the incoming member (0–4).");
const fixture = new URL("../qa/fixtures/buccaneer-captive-pen/A.json", import.meta.url);
const checkpointSha256 = createHash("sha256").update(readFileSync(fixture)).digest("hex");
const saves = join(root, "saves");
mkdirSync(saves, { recursive: true });
copyFileSync(fixture, join(saves, "A.json"));
const chrome = await openChromeCampaignLeg({
  chromePath,
  directory: join(root, "leg"),
  checkpointDir: saves,
  bootKeys: "31000000:1c0d,45000000:266c,52000000:1e61",
  startAt: "85000000",
  inputCompat: "discard-poll-prompt",
});
const data = process.env.POR_GAME_SOURCE;
assert.ok(data === "original" || data === "port");
const incomingPortrait = `portrait:area:1:ecl:b5f7:caller:9f20:PIC6.DAX:42:${member}:0`;
const evidence = [];
let frame;
const caption = () => frame.text.toSorted(([a], [b]) => a - b).map(([, char]) => String.fromCharCode(char)).join("");
async function advance(key) {
  await chrome.send(key);
  frame = await chrome.nextFrame();
}

async function verifyMenu(cursor, cue) {
  const portrait = `portrait:area:1:ecl:${cursor}:PIC6.DAX:42:${member}:0`;
  assert.match(caption(), cue);
  const observation = await chrome.evaluate(`new Promise((resolve,reject)=>{
    const start=performance.now();
    let first, samples=0;
    function sample(now){
      const image=document.querySelector("#tile-art:not([hidden]) .encounter-portrait");
      const key=image?.getAttribute("src")?.slice(5);
      if(state.sequence===${frame.sequence} && !animationFrame && !renderingSequence &&
          image?.complete && image.naturalWidth===352){
        if(key!==${JSON.stringify(portrait)})return reject(new Error("Wrong retained pose: "+key));
        if(image.dataset.heldPose)return reject(new Error("The menu is still animating"));
        first ??= now;
        samples++;
        if(now-first>=3050)return resolve({samples,durationMs:now-first});
      } else if(first!==undefined || now-start>9000)return reject(new Error("The held picture disappeared"));
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  })`);
  assert.ok(observation.samples>=90);
  const digests=await chrome.evaluate(`(async()=>{
    const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",value)),
      byte=>byte.toString(16).padStart(2,"0")).join("");
    const renderer=await (await fetch("/play.js")).text();
    const art=await fetch("/art/"+${JSON.stringify(portrait)});
    if(!art.ok) throw new Error("Missing held portrait");
    const bindings=await portraitLoopBindings;
    const encoder=new TextEncoder();
    return {
      rendererSha256:await digest(encoder.encode(renderer.replace(/\\r\\n/g,"\\n"))),
      bindingSha256:await digest(encoder.encode(bindings.portraitLoopSignature(${JSON.stringify(portrait)}))),
      artSha256:await digest(await art.arrayBuffer()),
    };
  })()`);
  evidence.push({cursor, route:"buccaneer-captive-pen-retained-"+member, data, caption:caption(), portrait, incomingPortrait,
    checkpointSha256, ...observation, ...digests, poses:[portrait], replaced:false});
  writeFileSync(join(root,cursor+".png"),await chrome.screenshot());
}

try {
  frame=await chrome.nextFrame();
  for (const key of ["right", "right", "up", "left", "up", "right", "up", "enter", "enter", "enter"]) await advance(key);
  assert.match(caption(), /WILLBRINGAGOODPRICEATZHENTILKEEP/i);
  const opened=await chrome.evaluate(`new Promise((resolve,reject)=>{
    const start=performance.now();
    function sample(now){
      const image=document.querySelector("#tile-art:not([hidden]) .encounter-portrait");
      if(!animationFrame && !renderingSequence && state.ready && image?.dataset.heldPose===${JSON.stringify(incomingPortrait)}){
        Promise.resolve(send("enter")).then(resolve,reject);
      } else if(now-start>9000)reject(new Error("The requested incoming pose never painted"));
      else requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  })`);
  assert.equal(opened,true);
  frame=await chrome.nextFrame();
  await verifyMenu("9f5d",/PUNCHMERCHANT.*RESCUEBOY/i);
  for (const key of ["end","end","end","enter"]) await advance(key);
  await verifyMenu("a26d",/HOWWILLYOURESCUETHEBOY/i);
  writeFileSync(join(root,"retained.json"),JSON.stringify(evidence,null,2)+"\n");
  console.log(data,"retained member",member,"through both Buccaneer menus");
} finally {
  await chrome.close();
}