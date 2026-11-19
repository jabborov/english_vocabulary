// Irregular English verbs: base -> [past simple, past participle].
// British forms first where two are common (e.g. "learnt/learned").
// window.verbForms(item) returns {past, perfect} for verb entries
// (including phrasal verbs such as "give up"), or null.
(function(){
  const V = {
    arise:['arose','arisen'], awake:['awoke','awoken'], be:['was/were','been'], bear:['bore','borne'],
    beat:['beat','beaten'], become:['became','become'], begin:['began','begun'], bend:['bent','bent'],
    bet:['bet','bet'], bid:['bid','bid'], bind:['bound','bound'], bite:['bit','bitten'],
    bleed:['bled','bled'], blow:['blew','blown'], break:['broke','broken'], breed:['bred','bred'],
    bring:['brought','brought'], broadcast:['broadcast','broadcast'], build:['built','built'],
    burn:['burnt/burned','burnt/burned'], burst:['burst','burst'], buy:['bought','bought'],
    cast:['cast','cast'], catch:['caught','caught'], choose:['chose','chosen'], cling:['clung','clung'],
    come:['came','come'], cost:['cost','cost'], creep:['crept','crept'], cut:['cut','cut'],
    deal:['dealt','dealt'], dig:['dug','dug'], do:['did','done'], draw:['drew','drawn'],
    dream:['dreamt/dreamed','dreamt/dreamed'], drink:['drank','drunk'], drive:['drove','driven'],
    eat:['ate','eaten'], fall:['fell','fallen'], feed:['fed','fed'], feel:['felt','felt'],
    fight:['fought','fought'], find:['found','found'], flee:['fled','fled'], fling:['flung','flung'],
    fly:['flew','flown'], forbid:['forbade','forbidden'], forecast:['forecast','forecast'],
    foresee:['foresaw','foreseen'], forget:['forgot','forgotten'], forgive:['forgave','forgiven'],
    freeze:['froze','frozen'], get:['got','got'], give:['gave','given'], go:['went','gone'],
    grind:['ground','ground'], grow:['grew','grown'], hang:['hung','hung'], have:['had','had'],
    hear:['heard','heard'], hide:['hid','hidden'], hit:['hit','hit'], hold:['held','held'],
    hurt:['hurt','hurt'], keep:['kept','kept'], kneel:['knelt','knelt'], know:['knew','known'],
    lay:['laid','laid'], lead:['led','led'], lean:['leant/leaned','leant/leaned'], leap:['leapt/leaped','leapt/leaped'],
    learn:['learnt/learned','learnt/learned'], leave:['left','left'], lend:['lent','lent'], let:['let','let'],
    lie:['lay','lain'], light:['lit','lit'], lose:['lost','lost'], make:['made','made'],
    mean:['meant','meant'], meet:['met','met'], mislead:['misled','misled'], mistake:['mistook','mistaken'],
    misunderstand:['misunderstood','misunderstood'], outdo:['outdid','outdone'], outgrow:['outgrew','outgrown'],
    overcome:['overcame','overcome'], overdo:['overdid','overdone'], overhear:['overheard','overheard'],
    oversee:['oversaw','overseen'], oversleep:['overslept','overslept'], overtake:['overtook','overtaken'],
    overthrow:['overthrew','overthrown'], pay:['paid','paid'], prove:['proved','proved/proven'],
    put:['put','put'], quit:['quit','quit'], read:['read','read'], rebuild:['rebuilt','rebuilt'],
    redo:['redid','redone'], rethink:['rethought','rethought'], rewrite:['rewrote','rewritten'],
    rid:['rid','rid'], ride:['rode','ridden'], ring:['rang','rung'], rise:['rose','risen'],
    run:['ran','run'], saw:['sawed','sawn'], say:['said','said'], see:['saw','seen'], seek:['sought','sought'],
    sell:['sold','sold'], send:['sent','sent'], set:['set','set'], sew:['sewed','sewn'], shake:['shook','shaken'],
    shed:['shed','shed'], shine:['shone','shone'], shoot:['shot','shot'], show:['showed','shown'],
    shrink:['shrank','shrunk'], shut:['shut','shut'], sing:['sang','sung'], sink:['sank','sunk'],
    sit:['sat','sat'], sleep:['slept','slept'], slide:['slid','slid'], sling:['slung','slung'],
    smell:['smelt/smelled','smelt/smelled'], speak:['spoke','spoken'], speed:['sped','sped'],
    spell:['spelt/spelled','spelt/spelled'], spend:['spent','spent'], spill:['spilt/spilled','spilt/spilled'],
    spin:['spun','spun'], spit:['spat','spat'], split:['split','split'], spoil:['spoilt/spoiled','spoilt/spoiled'],
    spread:['spread','spread'], spring:['sprang','sprung'], stand:['stood','stood'], steal:['stole','stolen'],
    stick:['stuck','stuck'], sting:['stung','stung'], stink:['stank','stunk'], strike:['struck','struck'],
    string:['strung','strung'], strive:['strove','striven'], swear:['swore','sworn'], sweep:['swept','swept'],
    swell:['swelled','swollen'], swim:['swam','swum'], swing:['swung','swung'], take:['took','taken'],
    teach:['taught','taught'], tear:['tore','torn'], tell:['told','told'], think:['thought','thought'],
    throw:['threw','thrown'], thrust:['thrust','thrust'], tread:['trod','trodden'], undergo:['underwent','undergone'],
    understand:['understood','understood'], undertake:['undertook','undertaken'], undo:['undid','undone'],
    upset:['upset','upset'], wake:['woke','woken'], wear:['wore','worn'], weave:['wove','woven'],
    weep:['wept','wept'], win:['won','won'], wind:['wound','wound'], withdraw:['withdrew','withdrawn'],
    withhold:['withheld','withheld'], withstand:['withstood','withstood'], wring:['wrung','wrung'],
    write:['wrote','written']
  };
  window.IRREGULAR_VERBS = V;

  window.verbForms = function(item){
    if(!item || !/(^|\s)verb\b/i.test(item.p || '')) return null;
    const parts = String(item.w).trim().split(/\s+/);
    const base = parts[0].toLowerCase();
    let f = V[base];
    if(!f) return null;
    // "lie" meaning "say something untrue" is regular.
    if(base === 'lie' && /untrue|not true|tell a lie|deceive/i.test(item.def || '')) f = ['lied','lied'];
    const rest = parts.slice(1).join(' ');
    const join = x => rest ? `${x} ${rest}` : x;
    return {
      past: f[0].split('/').map(join).join(' / '),
      perfect: f[1].split('/').map(x => 'have ' + join(x)).join(' / ')
    };
  };
})();
