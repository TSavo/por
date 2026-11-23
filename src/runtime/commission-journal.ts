interface Commission {
  id: string;
  title: string;
  offer: string;
  alternateOffers?: readonly string[];
  accepted?: string;
  report?: string;
  next: string;
  afterAcceptance?: string;
}

// Triggers are fragments of the original ECL dialogue. Directions summarize
// the commission; discoveries along the route can refine them separately.
export const commissions: readonly Commission[] = [
  { id: "slums", title: "Clear the Slums", offer: "THE SLUMS IMMEDIATELY TO OUR WEST NEED TO BE CLEARED OF MONSTERS", report: "YOUR CLEARING OF THE SLUM AREAS PERMITS US TO EXPAND", next: "Head west from New Phlan, clear the Slums, and report to the clerk." },
  { id: "sokal", title: "Clear Sokal Keep", offer: "SOKAL KEEP ON THORN ISLAND MUST BE CLEARED", report: "WITH SOKAL KEEP IN OUR HANDS", next: "Find passage to Thorn Island, clear the keep, and report to the clerk." },
  { id: "records", title: "Recover records of old Phlan", offer: "THE COUNCIL IS OFFERING A REWARD FOR BOOKS, MAPS, TOMES", report: "THERE IS A REWARD FOR CLEARING THE LIBRARY", next: "Search the old city for historical records and bring worthwhile finds to the clerk." },
  { id: "auction", title: "Investigate the auction", offer: "A WEAPON OF GREAT POWER IS TO BE AUCTIONED TO OUR ENEMIES", report: "YOUR SUCCESS AT PODAL PLAZA IS NOTED", next: "Observe the auction at Podal Plaza, identify the weapon, and report to the clerk.", afterAcceptance: "If you're still in New Phlan, ask the harbor master about passage toward Podal Plaza. Observe the auction, identify the weapon, and report to the clerk." },
  { id: "textile", title: "Recover Cadorna's treasure", offer: "A FAMILY TREASURE WAS HIDDEN IN THE WESTERN BUILDING OF THE TEXTILE COMPLEX", alternateOffers: ["THE CITY WATCH STOPS YOU AND REMOVES CADORNA'S TREASURE", "ACROSS THE LOCK IS THE SEAL OF THE FAMILY OF CADORNA"], report: "COUNCILMAN CADORNA LEFT THIS PAYMENT FOR SOME SERVICE YOU HAD RENDERED", next: "Search the western textile building for the treasure and return it to Cadorna.", afterAcceptance: "Go to the textile complex south of Podal Plaza. Search the western building for Cadorna's treasure." },
  { id: "bane", title: "Follow up with the Temple of Tyr", offer: "REPORT TO HIM AT TYR'S TEMPLE", alternateOffers: ["GO WITH HIM ACROSS THE RIVER AND HELP HIM TO CLEANSE THE TEMPLE"], report: "YOU MAY KEEP ALL YOU FOUND IN THE TEMPLE OF BANE AS A REWARD", next: "Speak with Bishop Braccio at Tyr's temple about his summons." },
  { id: "kovel", title: "Clear Kovel Mansion", offer: "A LARGE GROUP OF THIEVES OPERATES OUT OF THE OLD KOVEL MANSION", report: "THE ELIMINATION OF THE THIEVES IN KOVEL MANSION", next: "Find Kovel Mansion, deal with the thieves inside, and report to the clerk." },
  { id: "nomads", title: "Investigate the nomad camp", offer: "FIND THE NOMADS AND STOP THEM FROM JOINING FORCES WITH OUR ENEMIES", report: "THE NEWS YOU BRING FROM THE NOMAD CAMP", next: "Find the nomads, prevent their alliance with the enemy, and bring the news back." },
  { id: "kobolds", title: "Stop kobold reinforcements", offer: "A LARGE TRIBE OF KOBOLDS IS BEING RECRUITED BY THE ENEMY", report: "THIS LOSS OF THE KOBOLD FORCES WILL BE A MAJOR BLOW TO THE ENEMY", next: "Find the recruited tribe and prevent it from joining the enemy. Report to the clerk." },
  { id: "river", title: "End the river pollution", offer: "FIND THE SOURCE OF THE RIVER'S POLLUTION AND END IT", report: "WITH THE CLEARING OF THE STOJONOW RIVER", next: "Follow the polluted river to its source, end the contamination, and report back." },
  { id: "lizardmen", title: "Prevent the lizardfolk alliance", offer: "A TRIBE OF LIZARDMEN IS PREPARING TO JOIN THE ENEMY", report: "YOUR ELIMINATION OF THE LIZARDMEN MENACE", next: "Find the tribe, prevent it from joining the enemy, and report back." },
  { id: "rescue", title: "Rescue the Bivant heir", offer: "THE HEIR TO THE HOUSE OF BIVANT MUST BE RESCUED", report: "BIVANT WAS DELIGHTED WITH THE CHILD'S RESCUE", next: "Find the missing heir and bring him back safely." },
  { id: "zhentil", title: "Deliver the diplomatic packet", offer: "A MESSAGE BE DELIVERED TO THE ZHENTIL OUTPOST TO THE WEST", report: "CADORNA WAS WAGERING YOUR RETURN WOULD BE MUCH DELAYED", next: "Carry the packet to the outpost west of Phlan and report back." },
  {
    id: "graveyard",
    title: "End the graveyard menace",
    offer: "ACCEPT THE COMMISSION TO END THE GRAVEYARD MENACE",
    alternateOffers: ["THE COUNCIL DEMANDS THESE ATTACKS BE STOPPED. A GENEROUS REWARD IS OFFERED"],
    report: "A SPECIAL PRIZE FOR ENDING THE GRAVEYARD MENACE",
    next: "Investigate Valhingen Graveyard. If the clerk offers an enchanted weapon, decide whether to accept it.",
    afterAcceptance: "Take the clerk's enchanted weapon to Valhingen Graveyard and investigate the source of the attacks.",
  },
  { id: "gate", title: "Secure Stojanow Gate", offer: "WE MUST FIRST SECURE STOJANOW GATE", report: "YOUR TAKING THE GATE WILL ENABLE OUR FORCES", next: "Slip inside the gate, secure it, and report to the council." },
  { id: "castle", title: "Lead the assault on Valjevo Castle", offer: "OUR FORCES ARE MARSHALLED FOR THE ASSAULT ON VALJEVO CASTLE", report: "TYRANTHRAXUS IS DEFEATED! PHLAN IS FREE", next: "Return to Valjevo Castle, defeat the enemy leadership, and report to the council." },
  { id: "cadorna", title: "Find the fugitive Cadorna", offer: "PORPHYRYS CADORNA IS A TRAITOR TO THE CITY. IF YOU FIND HIM", report: "THE COUNCIL HAS NOTED THE PASSING OF THE TRAITOR CADORNA", next: "Follow any evidence of Cadorna's whereabouts and report what happens to him." },
  {
    id: "ohlo", title: "Fetch Ohlo's potion",
    offer: "THE POTION IS READY BUT I CAN'T LEAVE TO FETCH IT",
    accepted: "SPEAK MY NAME, OHLO",
    report: "THE MAN TAKES THE POTION AND GULPS IT GREEDILY",
    next: "Decide whether to accept the man's offer to fetch his potion.",
    afterAcceptance: "Go southeast to the Old Rope Guild, give Ohlo's name at the booth, and bring the potion back.",
  },
  {
    id: "bottle",
    title: "Recover the silver bottle",
    offer: "THEY HAVE POSSESION OF A POWERFUL SILVER BOTTLE",
    alternateOffers: ["THERE IS A SILVER BOTTLE OF GREAT POWER THERE", "THERE YOU SHALL FIND A MAGICAL BOTTLE"],
    accepted: "I ACCEPT YOUR PLEDGE. FOR YOUR FIRST DUTY",
    report: "YOU HAVE RECOVERED THE SILVER BOTTLE FROM THE KOBOLD CAVES",
    next: "Search the kobold settlement far to the east for the bottle and bring it back to the dragon.",
  },
  { id: "bottle-vampire", title: "Use the bottle against the vampire", offer: "WHEN YOU MEET THE VAMPIRE USE THE BOTTLE", next: "Take the bottle to Valhingen Graveyard and use it when you confront the vampire." },
];
