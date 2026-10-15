// Brand data for the six sample case studies.
// Ported unchanged from docs/reference/portfolio-v3-forest.html (const B), except:
//  - "[Town]" is "Leicester" throughout Halden, matching its logo
//  - sample people have clearly fictional sample names (Priya Shah, James Whitfield, Maria Lopes)
//  - Northfield MTD slide 1 says "Income Tax records are going quarterly" (see docs/content-audit.md)
// Image references (src / hli / avsrc) are photo base names in public/images/ and become
// base-aware URLs in src/lib/tiles.js.
export const B = [
{
 id:'solenne', g:'product', name:'Solenne', mark:'s', cat:'Skincare & beauty', catLong:'Skincare & beauty', chan:'Instagram · Facebook · Pinterest',
 about:'A small-batch skincare studio that wants its feed to feel as calm as its products: soft colour, real texture and routines people can actually follow.',
 vars:{bg:'#FBF6F2',ink:'#3E2730',acc:'#C9897B',sec:'#EBCFC4',ter:'#A7B59B',soft:'#F4E9E3',fd:"'Cormorant Garamond', Georgia, serif",fb:"'Jost', system-ui, sans-serif",fw:'500'},
 fdn:'Cormorant Garamond', fbn:'Jost', lbg:'sec', lfg:'ink',
 logo:`<div class="lg" style="font-family:var(--fd);font-style:italic;font-weight:500;font-size:clamp(46px,6vw,66px);display:flex;align-items:center;gap:.16em"><i style="width:.42em;height:.42em;border-radius:50%;background:var(--acc);display:inline-block"></i>solenne</div><div class="lgs">Botanical skincare · Bristol</div>`,
 tagline:'Skin, slowed down.',
 palette:[{n:'Milk',h:'#FBF6F2'},{n:'Blush',h:'#EBCFC4'},{n:'Clay Rose',h:'#C9897B'},{n:'Sage',h:'#A7B59B'},{n:'Plum',h:'#3E2730'}],
 sample:'Two drops of oil, pressed into damp skin, is the last step of an evening routine that takes under a minute.',
 voice:['Calm','Sensory','Honest'], say:'Two drops, pressed in. That’s all it needs.', nosay:'Miracle results overnight!',
 handle:'solenne.skin', bio:'Small-batch botanical skincare, made in Bristol. Fewer steps, better skin.', site:'solenne.example', hl:['Rituals','Products','Reviews','Studio'], hli:['sol4','gsol_hero','gsol_face','gsol_flat'],
 pillars:[{n:'Product',c:'acc',d:'Each product on its own colour, shot simply.'},{n:'Ritual & education',c:'ter',d:'How-tos and the weekly Ritual Notes series.'},{n:'Proof & studio',c:'ink',d:'Customer words and small-batch behind the scenes.'}],
 gridNote:'Each row mixes a photo, a type-led tile and an education or proof post, so no two neighbours share a format. Blush and plum alternate down the grid to keep it balanced.',
 caption:'Two drops of Night Oil, pressed into damp skin, is the last step of our 60-second evening routine. Squalane and rosehip, nothing else. Made in batches of 200 in our Bristol studio. #eveningskincare #faceoil #smallbatchskincare',
 alt:'Amber glass dropper bottle of Solenne Night Oil on a blush travertine step in warm, late-afternoon light.',
 grid:[
  {t:'pic',src:'gsol_hero',tag:'New',tagbg:'bg',tagc:'ink',cap:'Night Oil · 30 ml'},
  {t:'type',bg:'bg',fg:'ink',k:'The Solenne way',kc:'acc',text:'Fewer steps.<br>Better skin.',fs:'15cqi',h:'@solenne.skin'},
  {t:'series',bg:'ter',fg:'ink',acc:'bg',name:'Ritual Notes',ep:'No. 04',title:'The 60-second evening routine',h:'Every Sunday'},
  {t:'quote',bg:'ink',fg:'bg',acc:'acc',text:'My skin finally feels like mine again.',by:'Sample customer review'},
  {t:'pic',src:'gsol_flat',cap:'The Evening Set'},
  {t:'list',bg:'soft',fg:'ink',acc:'acc',k:'Ingredient focus',title:'Squalane',items:['Plant-derived, from olives','Light and non-greasy','Suits most skin types']},
  {t:'pic',src:'sol4',cap:'The 60-second ritual'},
  {t:'reel',src:'gsol_face',hook:'POV: your routine is shorter than the kettle',hl:'bg',hc:'ink'},
  {t:'type',bg:'sec',fg:'ink',k:'From our studio',text:'Made in batches of 200.',sub:'Mixed, filled and labelled by hand in Bristol.',fs:'12.5cqi'}
 ],
 creatives:[
  {kind:'reel',trend:'Reels · 3-second hook',title:'Routine Reel cover',tile:{t:'reel',src:'sol4',hook:'Stop layering nine products.',hl:'bg',hc:'ink'},caption:'The 3-step evening routine our founder actually uses ↓',why:'The hook reads before the sound comes on, and the caption carries the search keyword.',spec:'9:16 · 1080×1920 · text in the centre safe zone'},
  {kind:'single',trend:'Customer content',title:'Customer repost',tile:{t:'ugc',src:'gsol_face',text:'3 weeks in. Calmer skin, shorter routine.',handle:'@customer · reposted with permission'},why:'A real customer in real light builds more trust than another studio shot.',spec:'1080×1350 (4:5) · sample post'},
  {kind:'car',trend:'Save-worthy carousel',title:'How-to carousel',slides:[
    {t:'pic',src:'gsol_hero',k:'Ritual Notes',title:'How to use face oil without the shine',fs:'10.5cqi',at:'bot'},
    {t:'step',bg:'bg',fg:'ink',acc:'acc',num:'01',title:'Start on damp skin',body:'Oil spreads further and sinks in faster after toner or a splash of water.',brand:'Solenne',pg:'2 / 5'},
    {t:'step',bg:'bg',fg:'ink',acc:'acc',num:'02',title:'Serum before oil',body:'Go from the thinnest texture to the richest, so each layer can do its job.',brand:'Solenne',pg:'3 / 5'},
    {t:'step',bg:'bg',fg:'ink',acc:'acc',num:'03',title:'Two drops is plenty',body:'Warm them between your palms, then press into skin rather than rubbing.',brand:'Solenne',pg:'4 / 5'},
    {t:'cta',bg:'ink',fg:'bg',acc:'sec',bc:'ink',title:'Save this for tonight.',btn:'Shop Night Oil',sub:'New Ritual Notes every Sunday'}],why:'Teaching posts earn saves, and saves keep a post circulating for longer.',spec:'5 slides · 1080×1350 (4:5)'},
  {kind:'car',trend:'Photo dump',title:'"September in the studio" photo dump',slides:[
    {t:'pic',src:'gsol_flat',k:'Photo dump',title:'September in the studio',fs:'11cqi'},
    {t:'pic',src:'gsol_hero',hand:'batch no. 37 ✓',tape:true,shade:false,handc:'ink'},
    {t:'pic',src:'sol4',hand:'Sunday ritual',tape:true},
    {t:'pic',src:'gsol_face',hand:'your skin, your rules',tape:true},
    {t:'quote',bg:'acc',fg:'ink',acc:'bg',text:'Back in stock: Night Oil, batch 38.',by:'See you in October'}],why:'Mixing polished shots with candid ones makes the brand feel run by real people.',spec:'5 slides · 1080×1350 (4:5)'}
 ]
},
{
 id:'lowtide', g:'product', name:'Lowtide Coffee', mark:'≈', cat:'Food & drink', catLong:'Food & drink', chan:'Instagram · Facebook · TikTok',
 about:'A coastal roaster with a playful voice. The feed mixes rich coffee photography with brew education and a weekly tasting series.',
 vars:{bg:'#F3EEE6',ink:'#13314A',acc:'#F08A4B',sec:'#8FB8B0',ter:'#D9C2A0',soft:'#E9E1D4',fd:"'Bricolage Grotesque', 'Arial Narrow', system-ui, sans-serif",fb:"'Work Sans', system-ui, sans-serif",fw:'800',ls:'-.02em'},
 fdn:'Bricolage Grotesque', fbn:'Work Sans', lbg:'ink', lfg:'bg',
 logo:`<div class="lg" style="font-family:var(--fd);font-weight:800;font-size:clamp(44px,5.6vw,62px);letter-spacing:-.03em;display:flex;align-items:center;gap:.18em"><svg viewBox="0 0 40 26" width=".9em" height=".6em" aria-hidden="true"><path d="M2 8c6-6 10 6 18 0s12 6 18 0M2 19c6-6 10 6 18 0s12 6 18 0" style="fill:none;stroke:var(--acc);stroke-width:3.6;stroke-linecap:round"/></svg>lowtide</div><div class="lgs">Coffee roasters · Cornwall</div>`,
 tagline:'Roasted by the sea.',
 palette:[{n:'Foam',h:'#F3EEE6'},{n:'Sand',h:'#D9C2A0'},{n:'Sea Glass',h:'#8FB8B0'},{n:'Sunrise',h:'#F08A4B'},{n:'Deep Tide',h:'#13314A'}],
 sample:'Roasted every Tuesday on the Cornish coast and posted the same day, so it lands while it’s at its best.',
 voice:['Playful','Coastal','Unfussy'], say:'Roasted Tuesday. Gone by Friday.', nosay:'An artisanal coffee journey awaits.',
 handle:'lowtide.coffee', bio:'Small-batch coffee, roasted on the Cornish coast every Tuesday.', site:'lowtide.example', hl:['Brew guides','Roastery','Cupping Club','Café'], hli:['glow_pour','glow_bag','low4','glow_latte'],
 pillars:[{n:'Product',c:'acc',d:'Beans, brews and the roastery, shot warm and close.'},{n:'Brew education',c:'sec',d:'Recipes, grind guides and quick fixes.'},{n:'Community & series',c:'ink',d:'Cupping Club, collabs and customer words.'}],
 gridNote:'Warm coffee photography sits between bold Sunrise and Deep Tide tiles, so the grid reads as one brand from a distance while each post still works on its own.',
 caption:'Our V60 recipe for Sunrise Blend: 15 g coffee, 250 g water at 94°C, a 40-second bloom, done in about three minutes. Save it for the weekend. #pourover #v60 #specialtycoffeeuk',
 alt:'Orange Sunrise Blend coffee bag on a sea-green background with scattered roasted beans.',
 grid:[
  {t:'pic',src:'glow_bag',cap:'Sunrise Blend · 250 g',capc:'#fff'},
  {t:'type',bg:'ink',fg:'bg',k:'Fresh every week',kc:'acc',text:'Roasted Tuesday. In your cup by Friday.',fs:'11.5cqi'},
  {t:'pic',src:'glow_latte',cap:'Flat white, Saturday'},
  {t:'list',bg:'bg',fg:'ink',acc:'acc',k:'Brew guide',title:'V60 in four steps',items:['15 g coffee, medium-fine','250 g water at 94°C','Bloom for 40 seconds','Finish at about 3 minutes'],num:true},
  {t:'series',bg:'acc',fg:'ink',acc:'bg',name:'Cupping Club',ep:'Ep. 12',title:'Ethiopia, Guji',h:'Every Thursday'},
  {t:'pic',src:'low4',tag:'New',tagbg:'acc',tagc:'ink',cap:'Espresso, dialled in'},
  {t:'quote',bg:'sec',fg:'ink',acc:'ink',text:'Best decaf I’ve had. I didn’t believe it either.',by:'Sample customer review'},
  {t:'reel',src:'glow_pour',hook:'Guess the roast by the sound',hl:'acc',hc:'ink'},
  {t:'type',bg:'ter',fg:'ink',k:'Subscriptions',text:'Fresh coffee, on repeat.',sub:'Pause, skip or swap any week.',chip:'Start yours',chipbg:'ink',chipc:'bg',fs:'12cqi'}
 ],
 creatives:[
  {kind:'reel',trend:'Reels · 3-second hook',title:'Brew-fix Reel cover',tile:{t:'reel',src:'low4',hook:'Your coffee tastes bitter for one reason.',hl:'acc',hc:'ink'},caption:'(It’s usually the grind.) The fix is in the caption.',why:'A specific problem in the first frame stops the scroll; the answer keeps people watching.',spec:'9:16 · 1080×1920'},
  {kind:'single',trend:'Collab post',title:'Collab with a local bakery',tile:{t:'pic',src:'glow_latte',k:'Saturdays only',title:'Lowtide × Harbour Bakery',fs:'10.5cqi',cap:'Cardamom bun + Sunrise flat white',tag:'Collab',tagbg:'acc',tagc:'ink'},why:'A collab post shows on both grids at once, so each brand reaches the other’s followers.',spec:'1080×1350 (4:5) · Instagram collab post'},
  {kind:'car',trend:'Repeatable series',title:'Cupping Club · one template, every week',slides:[
    {t:'series',bg:'acc',fg:'ink',acc:'bg',name:'Cupping Club',ep:'Ep. 12',title:'Ethiopia, Guji',h:'Jasmine · peach · black tea'},
    {t:'series',bg:'sec',fg:'ink',acc:'bg',name:'Cupping Club',ep:'Ep. 13',title:'Colombia, Huila',h:'Red apple · panela · cocoa'},
    {t:'series',bg:'ink',fg:'bg',acc:'acc',name:'Cupping Club',ep:'Ep. 14',title:'Brazil, Cerrado',h:'Hazelnut · milk chocolate'},
    {t:'series',bg:'ter',fg:'ink',acc:'bg',name:'Cupping Club',ep:'Ep. 15',title:'Kenya, Nyeri',h:'Blackcurrant · grapefruit'}],why:'The same layout every Thursday means followers recognise the post before they read it.',spec:'Weekly series · 1080×1350 (4:5) · matching Reel covers'},
  {kind:'car',trend:'Save-worthy carousel',title:'"Grind size, explained" carousel',slides:[
    {t:'pic',src:'glow_bag',k:'Brew school',title:'Grind size, explained in three slides',fs:'10.5cqi'},
    {t:'step',bg:'bg',fg:'ink',acc:'acc',num:'Fine',ns:'15cqi',title:'Espresso',body:'About as fine as table salt. Water passes through fast, so the grind does the work.',brand:'Lowtide',pg:'2 / 5'},
    {t:'step',bg:'bg',fg:'ink',acc:'acc',num:'Medium',ns:'15cqi',title:'Pour-over',body:'Like coarse sand. Brews in around three minutes.',brand:'Lowtide',pg:'3 / 5'},
    {t:'step',bg:'bg',fg:'ink',acc:'acc',num:'Coarse',ns:'15cqi',title:'Cafetière',body:'Like sea salt. Four minutes of steeping, then press slowly.',brand:'Lowtide',pg:'4 / 5'},
    {t:'cta',bg:'acc',fg:'ink',acc:'ink',bc:'bg',title:'Not sure? We’ll grind it for you.',btn:'Choose your grind',sub:'Free on every order'}],why:'A plain answer to a common question gets saved and sent to friends.',spec:'5 slides · 1080×1350 (4:5)'}
 ]
},
{
 id:'loomhouse', g:'product', name:'Loom House', mark:'LH', cat:'Home & artisan', catLong:'Home & artisan', chan:'Instagram · Pinterest · Facebook',
 about:'A homeware maker selling woven throws and cushions. The feed leans on texture, real rooms and the craft behind every piece.',
 vars:{bg:'#F5F0E6',ink:'#2E3A6B',acc:'#E0A93B',sec:'#6B6B3A',ter:'#E2D6C2',soft:'#ECE4D6',fd:"'Fraunces', Georgia, serif",fb:"'Karla', system-ui, sans-serif",fw:'400'},
 fdn:'Fraunces', fbn:'Karla', lbg:'bg', lfg:'ink',
 logo:`<div class="lg" style="font-family:var(--fd);font-weight:600;font-size:clamp(42px,5.4vw,60px);letter-spacing:-.02em;display:flex;align-items:center;gap:.24em"><i style="width:.78em;height:.78em;display:inline-block;border-radius:.12em;background:repeating-linear-gradient(90deg,var(--ink) 0 .1em,transparent .1em .2em),repeating-linear-gradient(0deg,var(--acc) 0 .1em,var(--bg) .1em .2em)"></i>Loom House</div><div class="lgs">Woven homeware · Lancashire</div>`,
 tagline:'Made to be lived on.',
 palette:[{n:'Linen',h:'#F5F0E6'},{n:'Oat',h:'#E2D6C2'},{n:'Saffron',h:'#E0A93B'},{n:'Olive',h:'#6B6B3A'},{n:'Indigo',h:'#2E3A6B'}],
 sample:'Every throw is woven with a family mill in Lancashire, washed once, and folded by hand before it ships.',
 voice:['Warm','Crafted','Unhurried'], say:'Made to be leaned on, spilled on and loved.', nosay:'Luxury statement pieces for the discerning home.',
 handle:'loomhouse.studio', bio:'Woven throws and cushions, made with a mill in Lancashire.', site:'loomhouse.example', hl:['New in','Mill visits','Yarn','Your homes'], hli:['gloom_stack','gloom_mill','loom4','gloom_sofa'],
 pillars:[{n:'Product',c:'acc',d:'Throws and cushions in real rooms.'},{n:'Home & styling',c:'sec',d:'Styling ideas and customer homes.'},{n:'Craft',c:'ink',d:'Mill Diaries, materials and care.'}],
 gridNote:'Textured photos alternate with saffron and indigo tiles like a woven check, which is the brand’s own pattern. Text posts stay quiet so the textures do the work.',
 caption:'Our autumn throws in olive, saffron and indigo, woven in a merino blend with our Lancashire mill. Soft, warm and made to be leaned on. #woventhrows #britishmade #autumninteriors',
 alt:'Three folded woven throws in olive, saffron and indigo stacked on an oak bench in soft sunlight.',
 grid:[
  {t:'pic',src:'gloom_stack',cap:'Autumn throws · Merino blend'},
  {t:'type',bg:'ink',fg:'bg',k:'Loom House',kc:'acc',text:'Made to be lived on.',fs:'16cqi'},
  {t:'pic',src:'loom4',cap:'Lancashire wool, ready to weave'},
  {t:'swatch',bg:'soft',fg:'ink',k:'Autumn colourways',title:'Four shades, one weave',sw:[{n:'Indigo',c:'ink'},{n:'Saffron',c:'acc'},{n:'Olive',c:'sec'},{n:'Oat',c:'ter'}]},
  {t:'pic',src:'gloom_sofa',tag:'Your homes',tagbg:'bg',tagc:'ink'},
  {t:'list',bg:'bg',fg:'ink',acc:'acc',k:'Care guide',title:'Care in three lines',items:['Cool wash, wool cycle','Dry flat, away from heat','Air it between uses']},
  {t:'series',bg:'sec',fg:'bg',acc:'acc',name:'Mill Diaries',ep:'No. 07',title:'Warping the loom',h:'Every other Wednesday'},
  {t:'quote',bg:'acc',fg:'ink',acc:'ink',text:'It’s on the sofa every single night.',by:'Sample customer review'},
  {t:'reel',src:'gloom_mill',hook:'60 seconds inside the mill',hl:'acc',hc:'ink'}
 ],
 creatives:[
  {kind:'single',trend:'Editorial minimalism',title:'Single-product hero',tile:{t:'pic',src:'gloom_stack',shade:false,tag:'Loom House',tagbg:'bg',tagc:'ink'},why:'One room, soft light and plenty of space lets texture carry the post.',spec:'1080×1350 (4:5)'},
  {kind:'reel',trend:'Reels · 3-second hook',title:'Styling Reel cover',tile:{t:'reel',src:'gloom_sofa',hook:'One throw. Five ways. No new furniture.',hl:'acc',hc:'ink'},caption:'Number four is the one everyone screenshots.',why:'A promise in the first frame, with on-screen text for sound-off viewers.',spec:'9:16 · 1080×1920'},
  {kind:'single',trend:'Repeatable series',title:'Mill Diaries cover',tile:{t:'pic',src:'gloom_mill',k:'Mill Diaries · No. 07',title:'Warping the loom',fs:'12cqi',at:'bot'},why:'A recurring behind-the-scenes series turns the craft into content people look forward to.',spec:'1080×1350 (4:5) · every other Wednesday'},
  {kind:'car',trend:'Photo dump',title:'"A week at the mill" photo dump',slides:[
    {t:'pic',src:'gloom_mill',k:'Photo dump',title:'A week at the mill',fs:'11cqi'},
    {t:'pic',src:'loom4',hand:'yarn day, Tuesday',tape:true},
    {t:'swatch',bg:'bg',fg:'ink',k:'Colour test',title:'No. 4 made the cut',sw:[{n:'No. 1',c:'#C48A3A'},{n:'No. 2',c:'#D9B25A'},{n:'No. 3',c:'#B07C2C'},{n:'No. 4',c:'acc'}]},
    {t:'pic',src:'gloom_sofa',hand:'home, at last',tape:true},
    {t:'type',bg:'acc',fg:'ink',k:'Back in stock',text:'On the shelves Friday.',fs:'14cqi'}],why:'Candid frames from the mill sit beside finished pieces, so people see the craft as well as the product.',spec:'5 slides · 1080×1350 (4:5)'}
 ]
},
{
 id:'ashbygrant', g:'service', name:'Ashby Grant', mark:'AG', cat:'Legal', catLong:'Legal', chan:'LinkedIn · Facebook · Instagram',
 about:'A high-street firm of family, property and wills solicitors. The content answers real client questions in plain English.',
 vars:{bg:'#F6F3EC',ink:'#1B2A41',acc:'#B89B5E',sec:'#6D7F99',ter:'#DDE3EA',soft:'#EDE8DD',fd:"'Libre Caslon Text', Georgia, serif",fb:"'IBM Plex Sans', system-ui, sans-serif",fw:'400'},
 fdn:'Libre Caslon Text', fbn:'IBM Plex Sans', lbg:'ink', lfg:'bg',
 logo:`<div class="lg" style="font-family:var(--fd);font-size:clamp(30px,3.6vw,40px);letter-spacing:.2em;text-transform:uppercase;line-height:1.15">Ashby<span style="color:var(--acc)"> · </span>Grant</div><div class="lgs" style="letter-spacing:.28em;text-transform:uppercase">Solicitors</div>`,
 tagline:'Plain answers to legal questions.',
 palette:[{n:'Ivory',h:'#F6F3EC'},{n:'Mist',h:'#DDE3EA'},{n:'Brass',h:'#B89B5E'},{n:'Slate Blue',h:'#6D7F99'},{n:'Navy',h:'#1B2A41'}],
 sample:'Buying a home involves four main stages. Here is what happens at each one, and what we will need from you.',
 voice:['Clear','Reassuring','Expert'], say:'Here’s what happens next, step by step.', nosay:'Pursuant to the aforementioned matter…',
 handle:'ashbygrant.law', bio:'Family, property and wills solicitors. Plain answers to legal questions.', site:'ashbygrant.example', hl:['Ask Ashby','Moving home','Our team','Office'], hli:['ash4','ash1','ash2','ash3'],
 pillars:[{n:'Answers',c:'acc',d:'Ask Ashby: one real client question a week.'},{n:'People',c:'sec',d:'The solicitors clients will actually speak to.'},{n:'Practical guides',c:'ink',d:'Checklists and step-by-step explainers.'}],
 gridNote:'Navy and ivory carry the authority. Brass appears once per row as a signature, and every row includes a real person or a real place so the firm never feels faceless.',
 caption:'If you live with your partner but aren’t married, they won’t automatically inherit from you without a will. This week’s Ask Ashby explains what to put in place, and why it matters. #willsandprobate #cohabitation #familylaw',
 alt:'Navy card with the question “Do I need a will if I’m not married?” in serif type.',
 grid:[
  {t:'type',bg:'ink',fg:'bg',k:'Ashby Grant Solicitors',kc:'acc',text:'Plain answers to legal questions.',fs:'12.5cqi'},
  {t:'series',bg:'bg',fg:'ink',acc:'acc',name:'Ask Ashby',ep:'Q.08',title:'Do I need a will if I’m not married?',h:'Answered every Monday'},
  {t:'pic',src:'ash1',cap:'Buying your first home?'},
  {t:'list',bg:'soft',fg:'ink',acc:'acc',k:'Moving home',title:'What we’ll ask you for',items:['Photo ID and proof of address','Your mortgage offer','Where your deposit comes from']},
  {t:'person',src:'ash2',name:'Priya Shah',role:'Property Associate',nb:'bg',nc:'ink'},
  {t:'quote',bg:'acc',fg:'ink',acc:'ink',text:'A will is the kindest piece of admin you’ll ever do.',by:'Sample post · Private Client team',stars:false},
  {t:'myth',bg:'bg',fg:'ink',fb:'ink',fc:'bg',myth:'Living together makes us common-law spouses.',fact:'Common-law marriage has no legal standing in England and Wales.'},
  {t:'person',src:'ash3',name:'James Whitfield',role:'Partner, Private Client',nb:'ink',nc:'bg'},
  {t:'pic',src:'ash4',cap:'Find us on the high street'}
 ],
 creatives:[
  {kind:'car',trend:'PDF carousel · 4:5',title:'Conveyancing explainer',slides:[
    {t:'pic',src:'ash1',k:'Buying a home in England',title:'What your solicitor actually does, in four steps',fs:'9.5cqi',at:'bot'},
    {t:'step',bg:'bg',fg:'ink',acc:'acc',num:'01',title:'Instruct and ID checks',body:'We check your ID, confirm where your funds come from and request the draft contract.',brand:'Ashby Grant',pg:'2 / 6'},
    {t:'step',bg:'bg',fg:'ink',acc:'acc',num:'02',title:'Searches and enquiries',body:'Local authority, water and environmental searches, plus questions on anything unclear.',brand:'Ashby Grant',pg:'3 / 6'},
    {t:'step',bg:'bg',fg:'ink',acc:'acc',num:'03',title:'Exchange of contracts',body:'Contracts are signed and swapped. From here, both sides are legally committed.',brand:'Ashby Grant',pg:'4 / 6'},
    {t:'step',bg:'bg',fg:'ink',acc:'acc',num:'04',title:'Completion',body:'Money moves, the keys are released and we register you as the new owner.',brand:'Ashby Grant',pg:'5 / 6'},
    {t:'cta',bg:'ink',fg:'bg',acc:'acc',bc:'ink',title:'Questions about your move?',btn:'Ask in the comments',sub:'We reply to every one'}],why:'One step per slide, well under 60 words each, with the full explanation in the post copy.',spec:'6 slides · 1080×1350 · uploaded as a PDF'},
  {kind:'li',trend:'People over logos',title:'Partner’s personal LinkedIn post',who:'James Whitfield',role:'Partner, Private Client · Ashby Grant',avsrc:'ash3',ar:'1.91/1',
   text:`Last week a client asked why I always ask about the family dog.

Because after twelve years of drafting wills, I’ve learned the questions people forget are rarely about money. They’re about who looks after what, and who.

Three things I now ask everyone:
1. Who should care for anyone, or anything, that depends on you?
2. Is there something sentimental that should go to a particular person?
3. Has anything changed since your last will: a move, a marriage, a separation?

Ten minutes of thinking now saves a family months of guessing later.`,
   img:{t:'pic',src:'ash4',shade:false,pos:'center 60%'},why:'Written for a partner’s own profile, in the first person, about real work.',spec:'~120 words · 1200×627 image'},
  {kind:'single',trend:'Lo-fi expert video',title:'60-second explainer cover',tile:{t:'video',src:'ash3',dur:'0:58',sub:'If you’re not married, your partner won’t automatically inherit without a will.',k:'Ask Ashby',kb:'acc',kc:'ink'},why:'A real solicitor, subtitled, filmed on a phone. It feels like advice, not an advert.',spec:'4:5 · 1080×1350 · burned-in subtitles'},
  {kind:'single',trend:'Zero-click value',title:'Myth vs fact card',tile:{t:'myth',bg:'ink',fg:'bg',fb:'acc',fc:'ink',myth:'If we split up, the house is shared 50/50.',fact:'For unmarried couples it usually depends on whose name is on the deeds. A declaration of trust sets out who owns what.',h:'Ask Ashby · Q.09'},why:'The whole answer sits in the post, so nobody needs to click away to get value.',spec:'1080×1350 (4:5)'}
 ]
},
{
 id:'northfield', g:'service', name:'Northfield', mark:'n.', cat:'Accounting & finance', catLong:'Accounting & finance', chan:'LinkedIn · Instagram · Facebook',
 about:'A small-business accountancy practice. The content takes the dread out of deadlines with calm, practical help.',
 vars:{bg:'#F7FAF8',ink:'#1F4D3F',acc:'#F07E62',sec:'#CFE6DA',ter:'#2B2F2E',soft:'#E6F1EB',fd:"'Plus Jakarta Sans', system-ui, sans-serif",fb:"'Plus Jakarta Sans', system-ui, sans-serif",fw:'800',ls:'-.02em'},
 fdn:'Plus Jakarta Sans ExtraBold', fbn:'Plus Jakarta Sans', lbg:'sec', lfg:'ink',
 logo:`<div class="lg" style="font-family:var(--fd);font-weight:800;font-size:clamp(44px,5.6vw,62px);letter-spacing:-.045em">northfield<span style="color:var(--acc)">.</span></div><div class="lgs">Chartered accountants · Leeds</div>`,
 tagline:'Numbers, made calm.',
 palette:[{n:'Paper',h:'#F7FAF8'},{n:'Mint',h:'#CFE6DA'},{n:'Coral',h:'#F07E62'},{n:'Forest',h:'#1F4D3F'},{n:'Graphite',h:'#2B2F2E'}],
 sample:'You’ll owe about this much in January. Here’s how to set it aside a little each month, so it doesn’t sting.',
 voice:['Practical','Friendly','Calm'], say:'Here’s roughly what you’ll owe, and how to plan for it.', nosay:'Leveraging synergistic tax solutions.',
 handle:'northfield.accounts', bio:'Chartered accountants for small businesses in Leeds. Numbers, made calm.', site:'northfield.example', hl:['Tax diary','MTD','Clients','Team'], hli:['nor2','nor1','nor1','nor3'],
 pillars:[{n:'Deadlines & rules',c:'sec',d:'Tax dates and changes, explained simply.'},{n:'People & reviews',c:'acc',d:'The team, client words and Q&As.'},{n:'Practical help',c:'ink',d:'Checklists and the tools we really use.'}],
 gridNote:'Mint and forest keep the feed calm. Coral appears only where we want a reaction, such as reviews and questions, so it never feels alarming.',
 caption:'Online Self Assessment returns for 2025–26 are due by 31 January 2027, along with any tax owed. If your paperwork is still in a shoebox, now’s the time to get in touch. #selfassessment #smallbusinessuk #leedsaccountants',
 alt:'Hands typing on a laptop at a wooden desk beside an open notebook.',
 grid:[
  {t:'type',bg:'ink',fg:'bg',k:'Northfield Accountants',kc:'sec',text:'Numbers, made calm.',fs:'15cqi'},
  {t:'list',bg:'sec',fg:'ink',acc:'acc',k:'Tax diary',title:'Self Assessment dates',items:['31 Oct · paper returns due','31 Jan · online returns due','31 Jan · tax owed and first payment on account']},
  {t:'pic',src:'nor2',title:'Receipts in a shoebox? We’ve seen worse.',fs:'9cqi'},
  {t:'list',bg:'bg',fg:'ink',acc:'acc',k:'Making Tax Digital',title:'The new yearly rhythm',items:['Keep digital records','Send quarterly updates','Submit a final declaration'],num:true},
  {t:'quote',bg:'acc',fg:'ink',acc:'ink',text:'Our accountant answers the phone. Revolutionary.',by:'Sample client review'},
  {t:'person',src:'nor3',name:'Maria Lopes',role:'Client Manager',nb:'bg',nc:'ink'},
  {t:'list',bg:'soft',fg:'ink',acc:'ink',k:'Year end',title:'Before you send us your books',items:['Every bank statement','Your mileage log','Receipts for new equipment']},
  {t:'type',bg:'ter',fg:'bg',k:'Ask us anything',kc:'acc',text:'Drop your question in the comments. We answer every one.',fs:'9.6cqi'},
  {t:'reel',src:'nor1',hook:'What an accountant actually does in January',hl:'bg',hc:'ink'}
 ],
 creatives:[
  {kind:'car',trend:'PDF carousel · 4:5',title:'Making Tax Digital explainer',slides:[
    {t:'type',bg:'ink',fg:'bg',k:'Making Tax Digital',kc:'sec',text:'Income Tax records are going quarterly. Here’s what changes.',fs:'10cqi',h:'Swipe →'},
    {t:'step',bg:'bg',fg:'ink',acc:'acc',num:'01',title:'Who it affects',body:'Sole traders and landlords above the income threshold, which steps down over the next few years.',brand:'Northfield',pg:'2 / 6'},
    {t:'step',bg:'bg',fg:'ink',acc:'acc',num:'02',title:'Digital records',body:'Income and costs kept in compatible software as you go, not pieced together in January.',brand:'Northfield',pg:'3 / 6'},
    {t:'step',bg:'bg',fg:'ink',acc:'acc',num:'03',title:'Quarterly updates',body:'A short summary of your figures sent to HMRC every three months.',brand:'Northfield',pg:'4 / 6'},
    {t:'step',bg:'bg',fg:'ink',acc:'acc',num:'04',title:'Final declaration',body:'One year-end submission that confirms the full picture.',brand:'Northfield',pg:'5 / 6'},
    {t:'cta',bg:'acc',fg:'ink',acc:'ink',bc:'bg',title:'Not sure if it applies to you?',btn:'Ask us in the comments',sub:'Every question gets an answer'}],why:'A process framework, one step per slide, posted from the partner’s own profile for reach.',spec:'6 slides · 1080×1350 · uploaded as a PDF'},
  {kind:'single',trend:'Raw screenshots',title:'Annotated spreadsheet post',tile:{t:'sheet',file:'tax-pot.xlsx',rows:[['Month','Income','Costs','Set aside (25%)'],['Aug','£6,200','£1,450','£1,190'],['Sep','£5,800','£1,320','£1,120'],['Oct','£7,100','£1,610','£1,370']],hlcol:3,note:'↑ this column = no January panic',hc:'#C2410C'},why:'A real working file feels more trustworthy than another polished template.',spec:'1080×1350 (4:5) · illustrative figures'},
  {kind:'single',trend:'Zero-click value',title:'"Screenshot this" checklist',tile:{t:'list',bg:'ink',fg:'bg',acc:'sec',k:'Screenshot this',title:'Your year-end checklist',items:['Statements for every account','Sales invoices and receipts','Mileage log','Use-of-home details','Pension contributions','New equipment bought'],h:'Northfield Accountants'},why:'Useful enough to save without clicking anywhere, and it brings people back in January.',spec:'1080×1350 (4:5)'},
  {kind:'single',trend:'Newsletter with a fixed shape',title:'LinkedIn newsletter · 3-2-1',ar:'auto',tile:{t:'nl',bg:'bg',fg:'ink',acc:'sec',kc:'acc',k:'The Calm Ledger · Issue 14',title:'This month, in six lines',blocks:[{n:'3',h:'Things that held up',items:['Snapping receipts weekly makes quarterly updates quicker','A separate business account simplifies year end','A fixed monthly salary smooths cash flow']},{n:'2',h:'Our takes',items:['Software doesn’t replace a quarterly review','Your accountant should be a phone call, not a portal']},{n:'1',h:'Risk to watch',items:['Payments on account are due on 31 January. Set the money aside now.']}]},why:'The same 3-2-1 shape every issue makes it quick to read and quick to write.',spec:'LinkedIn newsletter · article + 1920×1080 cover'}
 ]
},
{
 id:'halden', g:'service', name:'Halden', mark:'H', cat:'Local trades', catLong:'Local trades', chan:'Facebook · Instagram · Google Business Profile',
 about:'A local plumbing and heating firm. The content is helpful, a little funny, and full of real jobs on real streets.',
 vars:{bg:'#F4F5F2',ink:'#1F2326',acc:'#F5C543',sec:'#2B7A78',ter:'#D7DBD6',soft:'#E9EBE7',fd:"'Archivo', 'Arial Black', system-ui, sans-serif",fb:"'Archivo', system-ui, sans-serif",fw:'900',ls:'-.02em'},
 fdn:'Archivo Black', fbn:'Archivo', lbg:'ink', lfg:'bg',
 logo:`<div class="lg" style="font-family:var(--fd);font-weight:900;font-size:clamp(46px,6vw,66px);letter-spacing:-.02em;text-transform:uppercase;display:flex;align-items:center;gap:.16em"><i style="width:.22em;height:.86em;background:var(--acc);display:inline-block;transform:skewX(-12deg)"></i>Halden</div><div class="lgs">Plumbing &amp; heating · Leicester</div>`,
 tagline:'Warm homes. Straight answers.',
 palette:[{n:'Cool White',h:'#F4F5F2'},{n:'Concrete',h:'#D7DBD6'},{n:'Signal Yellow',h:'#F5C543'},{n:'Teal',h:'#2B7A78'},{n:'Charcoal',h:'#1F2326'}],
 sample:'We’ll be there at 8, we’ll give you a fixed price before we start, and we’ll leave the place cleaner than we found it.',
 voice:['Straight-talking','Local','Dependable'], say:'We’ll be there at 8. Fixed price, no surprises.', nosay:'Your trusted total home solutions partner.',
 handle:'halden.heating', bio:'Gas Safe registered plumbing and heating in Leicester. Warm homes, straight answers.', site:'halden.example', hl:['Two-Minute Fix','Jobs','Radiators','Book'], hli:['hal3','hal1','hal2','ghal_boiler'],
 pillars:[{n:'Practical tips',c:'sec',d:'Two-Minute Fix and seasonal checks.'},{n:'Local proof',c:'acc',d:'Real jobs, before and afters, reviews.'},{n:'Team & van',c:'ink',d:'The engineers people already recognise.'}],
 gridNote:'Signal yellow is the van, the uniform and the logo, so it anchors one post per row. Teal handles the helpful tips, and real job photos keep it honest.',
 caption:'Radiator cold at the top? Bleed it in 60 seconds before you call anyone out. Here’s how, and when it’s time to call an engineer instead. Covering Leicester and 10 miles around. #heatingtips #boilerservice #localplumber',
 alt:'White combi boiler with neat copper pipework, fitted in a sage green kitchen.',
 grid:[
  {t:'pic',src:'ghal_boiler',cap:'Boiler service season',tag:'Book now',tagbg:'acc',tagc:'ink'},
  {t:'type',bg:'ink',fg:'bg',k:'Halden',kc:'acc',text:'Warm homes. Straight answers.',fs:'13.5cqi'},
  {t:'pic',src:'hal1',tag:'On the job',tagbg:'acc',tagc:'ink',cap:'Leak fixed, Leicester'},
  {t:'list',bg:'bg',fg:'ink',acc:'sec',k:'Before you call us',title:'Boiler acting up? Check these',items:['Pressure: about 1–1.5 bar when cold','Bleed any cold-topped radiators','Thermostat batteries']},
  {t:'quote',bg:'sec',fg:'bg',acc:'acc',text:'Turned up when they said. Left it spotless.',by:'Sample customer review'},
  {t:'series',bg:'acc',fg:'ink',acc:'ink',name:'Two-Minute Fix',ep:'No. 05',title:'Bleeding a radiator',h:'Every Tuesday'},
  {t:'reel',src:'hal3',hook:'A day in the van, in 30 seconds',hl:'acc',hc:'ink'},
  {t:'type',bg:'acc',fg:'ink',k:'Where we work',text:'Leicester and 10 miles around.',sub:'Same-week appointments, fixed prices.',fs:'12cqi'},
  {t:'review',bg:'ter',kc:'ink',ini:'S',name:'Sample customer',brand:'Halden',text:'Fixed price, fixed on time.',when:'3 days ago',k:'Reviews'}
 ],
 creatives:[
  {kind:'reel',trend:'Reels · 3-second hook',title:'How-to Reel cover',tile:{t:'reel',src:'hal3',hook:'Cold at the top? Bleed it in 60 seconds.',hl:'acc',hc:'ink'},caption:'Do this before you call us out. Seriously, it saves you money.',why:'Useful and a little funny, so people send it to whoever does the DIY at home.',spec:'9:16 · 1080×1920'},
  {kind:'single',trend:'Moment-led post',title:'Seasonal reminder',tile:{t:'type',bg:'acc',fg:'ink',k:'Heads up',text:'First cold snap = longest waiting list.',sub:'Book your boiler service now and skip the queue.',chip:'Gas Safe registered',chipbg:'ink',chipc:'acc',fs:'11.5cqi'},why:'Timed to the week people start thinking about heating, rather than a generic offer.',spec:'1080×1350 (4:5) · Facebook + Instagram'},
  {kind:'single',trend:'Customer content',title:'Review card',tile:{t:'review',bg:'sec',kc:'bg',ini:'J',name:'Sample customer',brand:'Halden Plumbing &amp; Heating',text:'Explained everything in plain English, gave a fixed price and stuck to it.',when:'1 week ago',k:'What our customers say'},why:'Existing reviews, reformatted as clean graphics, become reliable weekly content.',spec:'1080×1350 (4:5) · sample review'},
  {kind:'car',trend:'Raw & relatable',title:'Job-of-the-week carousel',slides:[
    {t:'type',bg:'ink',fg:'bg',k:'This week in Leicester',kc:'acc',text:'A leaking kitchen, sorted in a morning.',fs:'11.5cqi',h:'Swipe →'},
    {t:'pic',src:'hal1',hand:'9:10am: found it',tape:true},
    {t:'pic',src:'ghal_boiler',hand:'Thursday: new boiler, fitted',tape:true,handc:'ink',shade:false},
    {t:'review',bg:'acc',kc:'ink',ini:'S',name:'Sample customer',brand:'Halden',text:'Turned up at 8 like they said, fixed the leak and left the kitchen cleaner than they found it.',when:'2 days ago',k:'The verdict'}],why:'Real jobs on real streets are the strongest proof a local trade can show.',spec:'4 slides · 1080×1350 (4:5)'}
 ]
}
];

// Lavi's own projects (real, not samples). Same shape as B, plus:
//  - own: true (changes the "sample" labels on the case study, cards and schema)
//  - hlc: highlight colours, used instead of photos (hli) on the Instagram mock-up
//  - cover: HTML for the lead visual, used because there is no lead photo in LEAD
// Redrawn from the Paws, Peace & Poems logo: yellow paw, a line-drawn meditating figure and an open circle.
const PAW = `<svg viewBox="0 0 100 100" width="1em" height="1em" aria-hidden="true"><g fill="#F2C200"><ellipse cx="19" cy="44" rx="9.5" ry="12.5" transform="rotate(-22 19 44)"/><ellipse cx="37" cy="22" rx="9.5" ry="13" transform="rotate(-6 37 22)"/><ellipse cx="63" cy="22" rx="9.5" ry="13" transform="rotate(6 63 22)"/><ellipse cx="81" cy="44" rx="9.5" ry="12.5" transform="rotate(22 81 44)"/><path d="M50 46c-15 0-29 15-29 29 0 10 8 15 17 13 5-1 8-3 12-3s7 2 12 3c9 2 17-3 17-13 0-14-14-29-29-29z"/></g><g fill="none" stroke="#141414" stroke-linecap="round" stroke-linejoin="round"><path d="M27 82A33 33 0 0 1 64 21" stroke-width="2"/><path d="M50 30c-3 0-5 3-5 6s2 5 3 6c-6 1-9 6-9 12v9c0 2-1 4-3 5l-6 4c-2 1-1 4 1 4h38c2 0 3-3 1-4l-6-4c-2-1-3-3-3-5v-9c0-6-3-11-9-12 1-1 3-3 3-6s-2-6-5-6z" stroke-width="2.4"/><path d="M33 75c7-4 13-4 17-1 4-3 10-3 17 1" stroke-width="2.2"/></g></svg>`;

export const OWN = [
{
 id:'pawspeacepoems', g:'own', own:true, name:'Paws, Peace & Poems', mark:'P', cat:'Mental health & wellbeing', catLong:'Own project · Mental health & wellbeing', chan:'Instagram · LinkedIn group',
 about:'My own mental-health education page. It explains psychology in gentle, plain words, with a little humour, a lot of kindness and a place for people to feel heard.',
 vars:{bg:'#FFF9E8',ink:'#2F2A3A',acc:'#F2C200',sec:'#E8956B',ter:'#B9C9A7',soft:'#FBEFC9',fd:"'Fraunces', Georgia, serif",fb:"'Plus Jakarta Sans', system-ui, sans-serif",fw:'600'},
 fdn:'Fraunces', fbn:'Plus Jakarta Sans', lbg:'soft', lfg:'ink',
 logo:`<div class="lg" style="font-family:var(--fd);font-weight:600;font-size:clamp(34px,4.4vw,48px);line-height:1.05;display:flex;align-items:center;gap:.28em"><span style="font-size:1.5em;display:inline-flex">${PAW}</span><span>Paws, Peace<br><em style="font-weight:400">&amp; Poems</em></span></div><div class="lgs">Mental wellbeing, gently explained</div>`,
 tagline:'No matter how weird, you’re always PAWfect.',
 palette:[{n:'Cream',h:'#FFF9E8'},{n:'Butter',h:'#FBEFC9'},{n:'Sunflower',h:'#F2C200'},{n:'Peach Clay',h:'#E8956B'},{n:'Dusk',h:'#2F2A3A'}],
 sample:'Some days it isn’t a big breakdown. It’s just a quiet kind of heaviness you can’t quite explain.',
 voice:['Gentle','Relatable','Curious'], say:'You’re not lazy. Your brain is holding on to the unfinished thing.', nosay:'Five hacks to fix your anxiety today!',
 handle:'pawspeacenpoems', bio:'A space for everyone seeking mental stability, inner peace and a place to be heard 🧡', site:'linkedin.com/groups/10073484', hl:['Brain Bites','Neurodiversity','Body & mind','Poems'], hlc:['acc','ter','sec','ink'],
 cover:`<div class="pp-cover"><span class="pp-paw">${PAW}</span><span class="pp-k">My own project</span><span class="pp-t">Psychology, gently explained.</span></div>`,
 pillars:[{n:'Brain Bites',c:'acc',d:'One psychology idea a week, explained in plain words.'},{n:'Body & mind',c:'sec',d:'How stress shows up in sleep, skin and energy.'},{n:'Reflections',c:'ter',d:'First-person captions and short poems that make people feel less alone.'}],
 gridNote:'Every tile sits on cream or butter, so the feed feels soft and calm. Sunflower marks the weekly explainer, peach marks body-and-mind posts, and reflective posts stay quiet so the words do the work.',
 caption:'Ever finish a full day of work and still feel you didn’t do enough? That’s the Zeigarnik effect: your brain holds on to unfinished tasks more tightly than finished ones. Writing down when you’ll do the last thing can help you switch off. #mentalhealthawareness #psychologyfacts #zeigarnikeffect',
 alt:'Cream square with the words “Brain Bites No. 12: the Zeigarnik effect” in dark serif type beside a small sunflower-yellow paw.',
 grid:[
  {t:'series',bg:'acc',fg:'ink',acc:'bg',name:'Brain Bites',ep:'No. 12',title:'The Zeigarnik effect',h:'Psychology, gently explained'},
  {t:'type',bg:'bg',fg:'ink',k:'Paws, Peace & Poems',kc:'sec',text:'No matter how weird, you’re always PAWfect.',fs:'11cqi'},
  {t:'quote',bg:'soft',fg:'ink',acc:'sec',text:'Some days it isn’t a breakdown. Just a quiet kind of heaviness.',by:'From the journal',stars:false},
  {t:'list',bg:'bg',fg:'ink',acc:'sec',k:'Body & mind',title:'Stress can show up as…',items:['Tiredness after a full night’s sleep','Skin flare-ups','Brain fog and a short fuse']},
  {t:'type',bg:'ink',fg:'bg',k:'Optimism bias',kc:'acc',text:'“I don’t know how, but I know I will.”',fs:'11.5cqi'},
  {t:'myth',bg:'bg',fg:'ink',fb:'ter',fc:'ink',myth:'OCD just means being very tidy.',fact:'OCD involves unwanted, distressing thoughts and urges. It isn’t a personality quirk.',h:'Understanding starts with compassion'},
  {t:'series',bg:'ter',fg:'ink',acc:'bg',name:'Neurodiversity, kindly',ep:'Part 4',title:'The highly sensitive brain',h:'Sensitive isn’t fragile'},
  {t:'type',bg:'soft',fg:'ink',k:'Gentle reminder',kc:'sec',text:'Rest isn’t a reward. It’s a need.',fs:'13cqi'},
  {t:'cta',bg:'sec',fg:'ink',acc:'ink',bc:'bg',title:'A place to be heard.',btn:'Join the community',sub:'Paws, Peace & Poems on LinkedIn'}
 ],
 creatives:[
  {kind:'car',trend:'Save-worthy carousel',title:'“Tired after 8 hours’ sleep?” explainer',slides:[
    {t:'type',bg:'acc',fg:'ink',k:'Body & mind',text:'Slept 8 hours. Still exhausted?',fs:'12cqi',h:'Swipe →'},
    {t:'step',bg:'bg',fg:'ink',acc:'sec',num:'01',title:'Your mind has been working overtime',body:'Worry, planning and constant decisions use energy too, even when your body has been still.',brand:'Paws, Peace & Poems',pg:'2 / 5'},
    {t:'step',bg:'bg',fg:'ink',acc:'sec',num:'02',title:'Stress keeps you on alert',body:'Stress hormones are meant for short bursts. Weeks of them can leave you wired at night and drained by day.',brand:'Paws, Peace & Poems',pg:'3 / 5'},
    {t:'step',bg:'bg',fg:'ink',acc:'sec',num:'03',title:'Rest is more than sleep',body:'Short breaks, time outdoors and switching off from screens give your mind a rest too.',brand:'Paws, Peace & Poems',pg:'4 / 5'},
    {t:'cta',bg:'ink',fg:'bg',acc:'acc',bc:'ink',title:'Tired for weeks and not sure why?',btn:'Talk to your GP',sub:'This is general information, not medical advice'}],why:'A relatable question on the first slide, one idea per slide, and a clear signpost to proper help on the last.',spec:'5 slides · 1080×1350 (4:5)'},
  {kind:'single',trend:'Zero-click value',title:'Myth vs fact card',tile:{t:'myth',bg:'soft',fg:'ink',fb:'acc',fc:'ink',myth:'If you’re high-functioning, you can’t be struggling.',fact:'Plenty of people keep everything running on the outside while feeling exhausted on the inside.',h:'Paws, Peace & Poems'},why:'The whole message sits in the post, so it helps people even if they never click.',spec:'1080×1350 (4:5)'},
  {kind:'li',trend:'People over logos',title:'Founder’s LinkedIn post',ini:'LB',who:'Lavi Bachchis',role:'Marketing & brand lead · Founder, Paws, Peace & Poems',text:'I started Paws, Peace & Poems for a simple reason: most of us were never taught how our own minds work.<br><br>So every week I take one idea from psychology, like why unfinished tasks follow you to bed, and explain it in plain, kind words.<br><br>No diagnosing. No quick fixes. Just a bit more understanding, and a place to be heard.<br><br>If that sounds like something you need, the group is open to everyone.',img:{t:'type',bg:'acc',fg:'ink',k:'Paws, Peace & Poems',text:'A place to be heard.',fs:'13cqi'},ar:'1.91/1'},
  {kind:'car',trend:'Repeatable series',title:'Brain Bites · one template, every week',slides:[
    {t:'series',bg:'acc',fg:'ink',acc:'bg',name:'Brain Bites',ep:'No. 12',title:'The Zeigarnik effect',h:'Why unfinished tasks stay on your mind'},
    {t:'series',bg:'sec',fg:'ink',acc:'bg',name:'Brain Bites',ep:'No. 13',title:'Emotional blunting',h:'When the feeling is there but the expression isn’t'},
    {t:'series',bg:'ter',fg:'ink',acc:'bg',name:'Brain Bites',ep:'No. 14',title:'Optimism bias',h:'“I don’t know how, but I know I will”'},
    {t:'series',bg:'ink',fg:'bg',acc:'acc',name:'Brain Bites',ep:'No. 15',title:'Mental exhaustion',h:'Tired, even after sleeping'}],why:'One layout every week, so followers recognise the post before they read it and come back for the next one.',spec:'Weekly series · 1080×1350 (4:5)'}
 ]
}
];

export const ALL = [...B, ...OWN];
export const byId = Object.fromEntries(ALL.map((b) => [b.id, b]));
