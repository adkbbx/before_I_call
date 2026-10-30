// Modern negative inflections outside direct quotations. Death verb しぬ and
// lexical 蹴り/けり are deliberately not blanket-matched as classical forms.
const negatives=[['聞こえぬ','聞こえない'],['見えぬ','見えない'],['知らぬ','知らない'],['わからぬ','わからない'],['できぬ','できない'],['出来ぬ','出来ない'],['いられぬ','いられない']];
export function modernNarration(text){
  return text.split(/(「[^」]*」|『[^』]*』)/gu).map(part=>{
    if(/^[「『]/u.test(part))return part;
    for(const [old,modern] of negatives)part=part.replaceAll(old,modern);
    return part;
  }).join('');
}
