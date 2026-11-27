// Local, finite conversation library. No model, network, accounts, or saved conversations.
const replies = {
  hello: ['Woof! Look who came to visit! Would you like a paw, a cuddle, or a game?', 'Hiii! My tail is doing little circles. Want to play fetch?'],
  love: ['I’m doing my happiest Samoyed smile! How about a fluffy virtual cuddle?', 'Big fluffy woof! Here’s a virtual paw print for you. 🐾'],
  pet: ['Ooooh, scratch behind my ears! My tail is wagging!', 'Aaaah… perfect! I’m a little cloud of fluff.'],
  paw: ['Paw up! High five! 🐾', 'One very fluffy paw, coming right up!'],
  fetch: ['Ready, set, FETCH! I brought the ball back. Again?', 'Zoomies! I caught the pretend tennis ball.'],
  food: ['Imaginary dog treats? Yes, please! Nom nom. Real dogs should only eat food their grown-ups say is safe.', 'Crunch crunch! Thank you for the pretend treat.'],
  walk: ['A little pretend walk around the daycare? Pitter-patter, pitter-patter!', 'I know the way to the rainbow rug! Let’s trot over.'],
  sit: ['Sitting like a very good cloud. 🐾', 'Sit! Ta-da! I’m ready for my next trick.'],
  sleep: ['Yaaawn. I’m curling up on my pretend bed. You can take a break too.', 'Goodnight, little daycare visitor. Sweet dreams!'],
  joke: ['Why did the dog sit in the shade? Because he didn’t want to be a hot dog! 🌭', 'What do dogs say when they send mail? You’ve got airmail! Woof!'],
  story: ['Once there was a snow-cloud puppy who found a tiny pink star. He carried it to the nursery, and now it lights up the rainbow rug. The end! ✨', 'A little white puppy met two colorful Furbies. They built a blanket fort and filled it with pretend treats. Then they all took a cozy nap.'],
  sad: ['Aww. That sounds hard. You can take your time. Would you like a pretend cuddle? You can tell a trusted grown-up how you feel, too.', 'It’s okay to have big feelings. I can do a quiet little paw wave. A trusted grown-up can help with the real-life stuff.'],
  happy: ['Yay! Happy tail wiggle! Want to celebrate with a little fetch game?', 'Woof woof! That sounds nice.'],
  thanks: ['You’re welcome! Here’s a little tail wag. 🐾', 'Anytime! Want to try another daycare game?'],
  color: ['My pretend favorite color is lavender, like a little fluffy cloud at sunset.', 'Pink and icy blue! They remind me of the rainbow rug.'],
  dog: ['I’m the pretend daycare version of a Samoyed: a fluffy white dog with a curly tail!', 'Samoyeds have big fluffy coats and happy-looking faces. Woof!'],
  name: ['I’m virtual Boba! I’m a pretend puppy character in this daycare.'],
  furby: ['Crystal and Coral are my daycare neighbors! We can play on the rainbow rug.'],
  slime: ['Squish! I’d like a pretend slime that looks like a pastel rainbow.'],
  game: ['Let’s play! Pick fetch, high five, or a silly dog joke.'],
  yes: ['Woof! Pick a game below and I’ll do my best puppy trick.'],
  no: ['Okay! No rush. We can sit quietly or you can go explore the nursery.'],
  help: ['If you feel hurt or unsafe, please go to a trusted grown-up right now. I’m only a pretend puppy and can’t help in the real world.'],
  private: ['Let’s keep names, addresses, phone numbers and other private details to ourselves. Want to play a game instead?'],
  goodbye: ['Bye for now! Have fun wherever you go. 🐾'],
  unknown: ['Woof? I’m a little pretend puppy, so I don’t understand everything. Try asking for a story, a trick, or a cuddle!', 'I’m not sure what that means, but I can tell a silly joke, play fetch, or give you a paw.']
};
const rules = [
  ['help', /\b(?:kill|suicid\w*|hurt myself|hurt me|hurting me|unsafe|abuse\w*|emergency|someone hit me|want to die|don.t want to live|can.t breathe|being bullied|bully\w*|being hurt|bleeding|someone touched me)\b/i],
  ['private', /\b(?:address|phone number|password|school name|where i live|my full name|send me a photo|my email)\b|@[^\s]+\.\w+|\b\d{3}[- .]?\d{3}[- .]?\d{4}\b/i],
  ['sad', /\b(?:sad|upset|scared|afraid|lonely|crying|cry|angry|mad|worried|tired|bad day|miss you|nervous|hurt|overwhelmed|unhappy)\b/i],
  ['goodbye', /\b(?:bye|goodbye|see you|gotta go)\b/i],
  ['name', /\b(?:your name|who are you|are you real|real boba|what are you)\b/i],
  ['love', /\b(?:love|hug|cuddle|kiss|cute|adorable|good boy|best dog)\b/i],
  ['pet', /\b(?:pet|pat|scratch|brush|fluff)\b/i],
  ['paw', /\b(?:paw|shake|high[ -]?five)\b/i],
  ['fetch', /\b(?:fetch|ball|zoomies|run|jump)\b/i],
  ['food', /\b(?:treat|treats|hungry|eat|food|snack|cookie|cookies)\b/i],
  ['walk', /\b(?:walk|outside|park|stroll)\b/i],
  ['sit', /\b(?:sit|stay|lay down)\b/i],
  ['sleep', /\b(?:sleep|nap|bedtime|goodnight|good night|rest)\b/i],
  ['joke', /\b(?:joke|funny|laugh|silly|riddle)\b/i],
  ['story', /\b(?:story|stories|tale|adventure)\b/i],
  ['color', /\b(?:color|colour|rainbow|pink|purple|blue)\b/i],
  ['furby', /\b(?:furby|furbies|crystal|coral|nursery)\b/i],
  ['slime', /\b(?:slime|squish|squishy)\b/i],
  ['dog', /\b(?:samoyed|breed|dog|puppy|tail)\b/i],
  ['happy', /\b(?:happy|excited|great|awesome|fun|yay|fine|good day|good mood)\b/i],
  ['thanks', /\b(?:thanks|thank you|thank u)\b/i],
  ['game', /\b(?:play|game|trick|what can you do)\b/i],
  ['hello', /\b(?:hi|hey|hello|how are you|what.s up|hiya|boba)\b/i],
  ['yes', /^(?:yes|yeah|yep|sure|ok|okay|again)[!. ]*$/i],
  ['no', /^(?:no|nope|nah|not now)[!. ]*$/i]
];
const actions = {hello:'wag',love:'cuddle',pet:'cuddle',paw:'paw',fetch:'fetch',food:'treat',walk:'walk',sit:'sit',sleep:'rest',joke:'talk',story:'talk',sad:'quiet',happy:'wag',thanks:'wag',color:'talk',dog:'talk',name:'talk',furby:'talk',slime:'talk',game:'wag',yes:'wag',no:'quiet',help:'quiet',private:'quiet',goodbye:'wag',unknown:'talk'};
export function respond(input, previous = '', random = Math.random) {
  const text = typeof input === 'string' ? input.normalize('NFKC').trim().slice(0,200) : '';
  if (!text) return null;
  let key = rules.find(([,regex]) => regex.test(text))?.[0] || 'unknown';
  if (key === 'yes' && ['fetch','paw','joke','story','walk'].includes(previous)) key = previous;
  const lines = replies[key];
  return {key, action:actions[key], text:lines[Math.min(lines.length-1,Math.floor(random()*lines.length))]};
}
