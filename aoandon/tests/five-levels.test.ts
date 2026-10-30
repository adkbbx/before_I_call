import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {levels,levelSchema,taleSchema,taleIndexSchema} from '../src/lib/schema.ts';
import {initialNight,loadNight,saveNight,blowOut,sceneKey} from '../src/lib/night.ts';
import {loadPrefs} from '../src/lib/prefs.ts';
import {availableLevels,aggregateMetrics} from '../src/lib/reader.ts';

test('five levels extend legacy tales, coverage and saved nights without migration',()=>{
  assert.deepEqual(levels,['N5','N4','N3','N2','N1']);
  const fixture=taleSchema.parse(JSON.parse(readFileSync(new URL('./fixtures/tale.fixture.json',import.meta.url),'utf8')));
  assert.deepEqual(availableLevels(fixture),['N4']);
  assert.equal(initialNight().level,'N4');
  for(const level of levels){
    assert.equal(levelSchema.parse(level),level);
    const values=new Map<string,string>();
    const store={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
    const night=blowOut(initialNight(level),sceneKey('mujina','s01',level));
    saveNight(night,store);assert.deepEqual(loadNight(false,store),night);
    values.set('aoandon.prefs.v1',JSON.stringify({level,furigana:'all',sound:false}));
    assert.equal(loadPrefs(store).furigana,'all');
  }
  const r=fixture.scenes[0].retellings.N4!;
  fixture.scenes[0].retellings.N2={...r,level:'N2'};
  fixture.scenes[0].retellings.N1={...r,level:'N1'};
  assert.deepEqual(availableLevels(taleSchema.parse(fixture)),['N4','N2','N1']);
  assert.equal(aggregateMetrics([fixture]).length,3);
  const {id,titleJa,titleEn,translator,illustration}=fixture;
  assert.equal(taleIndexSchema.parse({tales:[{id,titleJa,titleEn,translator,illustration,scenes:1,coverage:{N2:.97,N1:.98}}]}).tales[0].coverage.N1,.98);
});
