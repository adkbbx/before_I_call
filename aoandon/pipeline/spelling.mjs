// Unambiguous modern spellings. No homophone selection or lexical substitution.
// Keeping kana-only drafts prevents IPADIC from recognising e.g. じぶん at all.
import {hasHardKanji} from './check.mjs';
const spellings=[
  ['じぶん','自分'],['あかり','明かり'],['とおまわり','遠回り'],
  ['こうきょの','皇居の'],['こうきょが','皇居が'],['さかみち','坂道'],
  ['かたがわ','片側'],['さびし','寂し'],['とうぞく','盗賊'],
  ['おそわれ','襲われ'],['つめたい','冷たい'],['つめたく','冷たく'],['つめたか','冷たか'],
  ['はげし','激し'],['ふしぎ','不思議'],['あらわれ','現れ'],
  ['わかもの','若者'],['ぼうさん','坊さん'],['さむらい','侍'],
  ['うつくし','美し'],['おそろし','恐ろし'],['おどろき','驚き'],
  ['おどろく','驚く'],['おどろい','驚い'],['おどろか','驚か'],
  ['こわい','怖い'],['こわか','怖か'],['なみだ','涙'],
  ['のかべ','の壁'],['かべが','壁が'],['かべを','壁を'],['かべは','壁は'],
  ['息をきら','息を切ら'],
  ['緑のつつみ','緑の堤'],
];
export function atLevelSpelling(text,level){
  for(const [kana,normal] of spellings)if(!hasHardKanji(normal,level))text=text.replaceAll(kana,normal);
  return text;
}
