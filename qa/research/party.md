# The party a player following the guide makes

_Research pass on 2026-11-21 for the walkthrough acceptance tests. The sources were read again for
this note; the quotations are theirs. `tools/acceptance/party.mjs` builds the party described here
through the game's own menus, and `qa/fixtures/guide-party-new-phlan/` is the saved game it leaves._

## Sources

| Tag | Source | How it was read |
| --- | --- | --- |
| [P] | Stephen S. Lee, "Pool of Radiance: Exhaustive Game Information", v2.00 (2026-04-02), GameFAQs 73869, CC BY-NC 4.0, "written for PC version 1.3" | Fetched again on 2026-11-21: §3.1 to §3.4, §4.1.1 to §4.4, §5.1 to §5.4, §6.1, §6.2.1, the clerk's rewards in §6.2.2, §6.3.1 and §6.3.2. §7 (the rules sections on statistics, races and classes) was not fetched again; where it is used the digest (`guides-digest.md`, section 4) is cited. |
| [RB] | SSI rule book, `por-assets/gog-1.3/Manual.pdf` (no text layer; printed pages 1 to 7 read as images) | p.3 to 5 (races, ability scores, classes), p.6 (Creating a party of characters), p.7 (Modify Character) |
| [DC] | SSI "IBM and Compatibles Data Card", `Quick Reference Card.pdf` (Rev. 9/92) | text layer, "To Begin Playing Quickly" |
| [CB] | SSI Clue Book, `Cluebook.pdf`, printed pages 5 to 6 (Slums) and 53 to 54 (Hints on characters) | text layer (OCR) |

## What the sources say

### Which characters

- [P] §3.2, "Party for This Game Only": "I think the best party is: 3 Male Elf Lawful Good
  Fighter/Magic-Users; 1 Male Half-Elf Lawful Good Cleric/Fighter/Magic-User; 1 Female Human
  Cleric; 1 Male Elf Fighter/Magic-User/Thief." §3.3: "The second party above also works best if
  you plan to transfer characters to later games." The first party of §3.2 (four half-elf
  cleric/fighter/magic-users, the human cleric, the elf thief) is offered as "one power party that
  works well" and then set aside: "Having more than about 2 clerics does not really help much".
- [P] §3.1 gives the reasons: one thief, multi-classed with fighter; "at least one cleric", and
  "humans make the best clerics"; "at least three" fighters "to serve as your front line";
  magic-users, "the game becomes significantly harder if you have fewer than two"; "all fighters
  should be male" (Strength); one female character for a quest in the next game. On alignment:
  "it helps a little if all your non-thief fighters are lawful good", and "you should avoid evil
  characters".
- [P] names no alignment for the human cleric or the thief. The game offers a thief no lawful
  good and no chaotic good (digest section 4, from [P] §7.7.4). The acceptance party makes the
  cleric lawful good and the thief neutral good. That choice is ours.
- [CB] p.53 to 54 reasons differently and names no party: non-humans "should play to their strong
  points and be mixed class and let humans be the single class characters"; "Human fighters can
  be the best fighters in the game"; "your magic using characters should be elven or half-elven
  fighter/magic users, or half elven cleric/magic users or fighter/cleric/magic users"; "Dwarves
  and half-elves make the best fighter/thieves". Its rule for a balanced party: "at least four
  characters with good fighting capabilities, at least two characters that can throw clerical
  spells, at least two characters that can throw magic user spells, at least two characters who
  are equipped with bows, and at least one character who has thieving abilities." The party of
  [P] §3.2 meets every count except the bows, which [P] §4.1.1 says to leave for later.
- [RB] p.3: "For maximum flexibility, you should have a balanced party with characters of
  different classes and races." [DC]: "To Begin Playing Quickly: Use the pre-rolled and
  pre-equipped characters from the saved game disk". Neither names a party of the player's own.

### Modify

- [RB] p.6: "If you accept the rolls, you still have the opportunity to alter the character to
  match your own character from the AD&D game by using the Modify Character command". p.7,
  MODIFY CHARACTER: "You can adjust the created character's ability scores and HP. The character
  must start at 0 XP and with no items beyond those he can buy with his initial gold allowance."
- [P] §3.1: "You should maximize all relevant statistics before setting out ("M"odify
  character). It may seem like cheating, but later Gold Box games are very much balanced around
  having very high statistics". §4.1.1 opens: "Don't forget to "M"odify your characters'
  statistics before starting out!" For a player who prefers normal scores: "Dexterity is the most
  important statistic".
- [CB] p.54: "You can also modify a character's ability scores after he has been built, but not
  after he has gone up a level." Then the scores it wants: "Fighters need the highest possible
  strength"; magic-users "an Intelligence of at least 16"; clerics "a wisdom of 17 or better";
  "All characters need the highest possible dexterity"; "a constitution of 16 or better, and
  Fighter types need a constitution of 18"; "The party's spokesman needs a charisma of 18".
- Which values: [P] says "maximize" and gives no numbers in §3. The numbers are the game's own
  ceilings, which Modify enforces by race, sex and class (digest section 4, the table of racial
  ranges: elf male Strength 18(75), Dexterity 19; half-elf male Strength 18(90); a human woman
  who is no fighter has no exceptional Strength). The acceptance party raises all six scores and
  the hit points until the game raises them no further. What the game then shows is in the table
  below.

### What to buy

- [P] §4.1.1, "Initial Equipment": "Any character with thief as one class should buy leather
  armor, even if they can equip something better, because backstabbing is not allowed with
  heavier armor." "Fighters and clerics should buy banded mail, not plate mail." "Fighters and
  clerics should buy a shield." "Pure clerics should start with a flail, and pure magic-users
  with a quarterstaff. Anyone else should begin with a long sword." "You do not need to buy bows;
  you should find some soon enough after starting the game." "The old-school CRPG trick of
  creating a bunch of dummy characters, taking their gold, and deleting them does work here, but
  it isn't really even worth the time it takes."
- [P] §6.2.1, Strategy: "After creating your characters, buy melee weapons, armor, and shields.
  Then, stay in an inn to memorize spells. Next, go to the Phlan clerk's office to learn of the
  available commissions. ... If you are not familiar with the game, you should start the former
  quest [the Slums] first. Taverns are dangerous for brand-new characters and should be avoided at
  first."
- [DC]: "If you want to start your own characters, be sure to equip them before you start
  adventuring. A shop selling arms and armor is located at 8,11. Pool your money. Use the View,
  Items, and Ready commands to prepare your characters' equipment. Make sure you have at least one
  platinum piece left. Use the Take command and have one character pick up all the money. Go to
  the inn at 4,12, pay the money, and rest to memorize spells. Start adventuring in the slums.
  Return to the city hall periodically to collect commissions and rewards. When your characters
  have enough experience points and money, train in the training hall."
- [P] §4.3: "training costs 1000 gold at the appropriate training hall"; "You should pinch pennies
  early in the game, because training is a significant expense early. Appraise and sell all your
  jewelry and gems".

### Order and spells

- [P] §5.1: "Have your fighters form a line"; "Keep your primary cleric away from the front
  lines"; "The party member to be protected the most (primary cleric or single-classed
  magic-user) should be third-to-last in the order ... Your better-armored fighters with the most
  hit points should all be in the top half." "Most of the enemies in this game have no ranged
  attacks. If there is space in between you and them, it is often better to "D"elay your move and
  let them close distance".
- [P] §5.2: "The strongest combat spell in the early game is Sleep, by far. This will reliably
  knock out low-level living enemies in its square and in the eight adjacent squares (including
  your own low-level characters, so aim properly). Unlike many other spells, Sleep does not permit
  a saving throw. You can then dispatch sleeping foes at your leisure; any physical attack will
  eliminate a sleeping enemy." "Cure Light Wounds is the only curative spell you can cast in this
  game ... it takes 24 hours to recover a single hit point with normal rest ... So you always want
  multiple copies of this spell prepared." "Bless can be cast from the start".
- [CB] p.5 (Slums, the goblin guards): "Try to cast a sleep spell on the goblin leaders to reduce
  the enemy archery."

### The Slums at level 1

- [P] §6.3.1: "there is no way around fighting 15 random combats. All but one set combat are easy
  to win with the help of Sleep spells cast in the midst of clumps of monsters. Be sure to collect
  the treasure at locations 5, 12, and 16 as well. The ogre/troll combat in the southwest can be
  tackled with low-level characters, but is generally worth skipping until you've gained strength
  elsewhere."
- [P] §6.3.2, Resting: "You may safely rest either in a room where you have defeated a set
  encounter, or anywhere if you have cleared the block." [CB] p.5 says the same.
- Early money, from [P] §6.3.2: the stable (location 5) "2 gems, 100 gold, 20 Arrows +1, and a
  Short Bow +1"; the hobgoblins at (0,2) "50 platinum, 500 gold, Ring of Protection +1, Short Bow
  +1"; the secret room at (0,0) "2 jewelry, 4 gems, 50 platinum, 92 gold, 1000 electrum, 20 Arrows
  +1, and Short Bow +1"; the empty room (location 16) "2 gems, 200 platinum, Shield +1,
  Magic-User Scroll (Magic Missile)". The clerk's reward for the block ([P] §6.2.2, commission 1):
  "1 jewelry, 50 platinum, 250 gold (450 XP)".
- [P] §6.1: "Experience awards listed are per character, and assume you have exactly six
  characters in your party, unless otherwise stated."
- [P] §4.2 on hired help: "I don't usually recommend doing this. The main reasons to hire NPCs
  are: for the ogre/troll combat in the Slums ...". [CB] p.6 on the same fight: "You may want to
  go back to the hiring hall and hire a hero for this battle."

## What the game does (version 1.3, established with `tools/acceptance/party.mjs`)

The menus, in the order the game asks: Create New Character; race; sex; class; alignment; the roll
with "Keep this character? Yes No"; "Character name:"; "Head Body Keep" (the portrait); "Parts
color-1 color-2 Size Exit" (the combat icon) and "Is this icon ok? Yes No". The character is then
on the save disk; Add Character to Party puts it in the party, and the order of adding is the
marching order. Modify Character is on the party menu: Up and Down move between the six scores and
the hit points, Right and Left change the value, and the game stops at its own ceiling.

Raised until the game raises them no further (the rolls before Modify are the dice's and are not
kept):

| Character | Race, sex, classes, alignment | STR | INT | WIS | DEX | CON | CHA | HP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AELAR, BRENNAN, CAELUM | elf, male, fighter/magic-user, lawful good | 18(75) | 18 | 18 | 19 | 18 | 18 | 9 |
| ELSPETH | human, female, cleric, lawful good | 18 | 18 | 18 | 18 | 18 | 18 | 10 |
| DORIAN | half-elf, male, cleric/fighter/magic-user, lawful good | 18(90) | 18 | 18 | 18 | 18 | 18 | 9 |
| FINN | elf, male, fighter/magic-user/thief, neutral good | 18(75) | 18 | 18 | 19 | 18 | 18 | 8 |

Every one of those fields is set by Modify, so none depends on the dice. Age and starting gold
do: with the fixed dice of a replay the six start with 85, 75, 90, 50, 103 and 83 gold pieces, 486
in all.

The arms shop at (8,11) asks 15 for a long sword, 3 for a flail, 15 for a shield, 90 for banded
mail and 5 for leather armor. The list of [P] §4.1.1 for this party (five long swords, a flail,
five suits of banded mail, five shields, leather armor for the thief) comes to 608 gold pieces,
and the inn wants a platinum piece (5 gold) besides: 127 more than the party has. `shoppingList`
in `party.mjs` spends what there is in this order: a weapon for everyone, the thief's leather
armor, the five shields, banded mail in marching order, and for those it does not reach the
heaviest armor the rest buys. With 486 gold pieces that is banded mail for the three
fighter/magic-users, scale mail (45) for the cleric and leather armor (5) for the
cleric/fighter/magic-user; 3 gold and 1 platinum are left, and the platinum piece pays the inn at
(4,12). Armor classes after readying: -1, -1, -1, 1, 3 and 4.

In the inn each character chooses spells with Magic, Memorize: the game gives the pure cleric
three first-level places (one, and two more for Wisdom 18), the cleric/fighter/magic-user three
cleric places and one magic-user place, and each other magic-user one place. Every cleric place
takes Cure Light Wounds and every magic-user place Sleep: six cures and five Sleeps. The game sets
5 hours for the rest.

## Where the sources disagree

Recorded in `qa/disagreements-manual.json` under "Party creation".

1. **Who makes the best fighter/thief.** [CB] p.53: "Dwarves and half-elves make the best fighter/
   thieves because of their high maximum strength and their high maximum fighter level." [P] §3.1:
   "A dwarf is only really useful as a fighter/thief ... However, a fighter/magic-user/thief is
   more useful still", and §3.2 makes the thief an elf. Advice, not a fact about the game: play
   does not settle it.
2. **Whether single-class humans belong in the party.** [CB] p.53: "let humans be the single
   class characters ... Human fighters can be the best fighters in the game". [P] §3.2 has one
   human, the cleric, and no single-class fighter; §3.4 allows human fighters only to a player who
   will edit them into paladins and rangers in the next game. Advice.
3. **Whether high scores make the game send more monsters.** [CB] p.54: "Beginning characters with
   very high ability scores look to the computer like high level adventurers. This may put them at
   a disadvantage because the party does not have the HP, spells or the magic treasure of high
   level adventurers." [P] §3.1 says to maximize, and its Party Strength (digest section 4, from
   [P] §7.14) counts class levels, armor class, THAC0 and current hit points, not the scores
   themselves. Both can be true: the scores reach Party Strength through the armor class, THAC0
   and hit points they give. Play can settle the size of the effect: the same random encounter met
   by the ready-made party and by this one.
4. **When Modify stops being allowed.** [CB] p.54: "not after he has gone up a level". [RB] p.7:
   "The character must start at 0 XP". The digest (from [P]): "allowed while the character has 0
   XP". Play can settle it: Modify Character on a character who has experience points and has not
   trained.
