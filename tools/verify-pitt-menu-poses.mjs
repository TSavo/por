import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { openChromeCampaignLeg } from "./chrome-campaign-replay.mjs";

const [chromePath, root, member] = process.argv.slice(2);
assert.ok(chromePath && root && (member === "0" || member === "1"), "Pass the Chrome executable, output directory, and portrait member (0 or 1).");
const fixture = new URL("../qa/fixtures/podal-pitt-retained/I.json", import.meta.url);
const saves = join(root, "saves");
mkdirSync(saves, { recursive: true });
copyFileSync(fixture, join(saves, "I.json"));
const chrome = await openChromeCampaignLeg({
  chromePath,
  directory: join(root, "leg"),
  checkpointDir: saves,
  bootKeys: "31000000:1c0d,45000000:266c,52000000:1769",
  startAt: "85000000",
  inputCompat: "discard-poll-prompt",
});
const caption = frame => frame.text.toSorted(([a], [b]) => a - b).map(([, ch]) => String.fromCharCode(ch)).join("");
let frame;
async function press(key) {
  await chrome.send(key);
  frame = await chrome.nextFrame();
}
const evidence = [];
async function advanceOnPose(caller, cursor, cue) {
  const sourceKey = `portrait:area:18:ecl:b240:caller:${caller}:PIC1.DAX:2:${member}:0`;
  const targetKey = `portrait:area:18:ecl:${cursor}:PIC1.DAX:2:${member}:0`;
  const observed = await chrome.evaluate(`new Promise((resolve,reject)=>{
    const start=performance.now();
    function sample(now){
      const image=document.querySelector('#tile-art:not([hidden]) .encounter-portrait');
      if(!animationFrame && !renderingSequence && state.ready && image?.dataset.heldPose===${JSON.stringify(sourceKey)}){
        Promise.resolve(send("enter")).then(resolve,reject);
      } else if(now-start>9000)reject(Error("The requested source member did not paint"));
      else requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  })`);
  assert.equal(observed, true);
  frame = await chrome.nextFrame();
  assert.match(caption(frame), cue);
  const observation = await chrome.evaluate(`new Promise((resolve,reject)=>{
    const start=performance.now();
    let first,samples=0;
    function sample(now){
      const image=document.querySelector('#tile-art:not([hidden]) .encounter-portrait');
      const key=image?.getAttribute('src')?.slice(5);
      if(state.sequence===${frame.sequence} && !animationFrame && !renderingSequence && image?.complete && image.naturalWidth===352){
        if(key!==${JSON.stringify(targetKey)})return reject(Error("Wrong retained member: "+key));
        first ??= now;
        samples++;
        if(now-first>=3050)return resolve({key,samples,durationMs:now-first});
      } else if(first!==undefined || now-start>9000)return reject(Error("The retained portrait disappeared"));
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  })`);
  assert.ok(observation.samples>=90);
  evidence.push({ sourceKey, targetKey, caption: caption(frame), ...observation });
  writeFileSync(join(root, `${cursor}.png`), await chrome.screenshot());
}
try {
  frame = await chrome.nextFrame();
  for (const key of ["up", "enter", "enter"]) await press(key);
  await advanceOnPose("ab51", "ab8d", /MIXWITHMONSTERS/i);
  await press("enter");
  await advanceOnPose("abde", "ac22", /INSULTBACK/i);
  await press("enter");
  assert.match(caption(frame), /YOURACTIONSTRIGGERAFREEFORALL/i);
  writeFileSync(join(root, "retained.json"), JSON.stringify(evidence, null, 2) + "\n");
  console.log(evidence.map(({ sourceKey, targetKey, durationMs }) => [sourceKey, targetKey, durationMs]));
} finally {
  await chrome.close();
}

