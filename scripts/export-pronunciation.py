"""Export the shared dictionary for review or manual ElevenLabs import."""
import argparse
import json
import sys
from pathlib import Path
import xml.etree.ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server.pronunciation import dictionary_rules

parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, default=Path('work/pronunciation'))
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
rules = dictionary_rules()
(args.output / 'japanese-pronunciation.json').write_text(json.dumps(rules, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
namespace = 'http://www.w3.org/2005/01/pronunciation-lexicon'
ET.register_namespace('', namespace)
root = ET.Element(f'{{{namespace}}}lexicon', {'version': '1.0', '{http://www.w3.org/XML/1998/namespace}lang': 'ja-JP'})
for rule in rules:
    lexeme = ET.SubElement(root, f'{{{namespace}}}lexeme')
    ET.SubElement(lexeme, f'{{{namespace}}}grapheme').text = rule['string_to_replace']
    ET.SubElement(lexeme, f'{{{namespace}}}alias').text = rule['alias']
ET.indent(root)
ET.ElementTree(root).write(args.output / 'japanese-pronunciation.pls', encoding='utf-8', xml_declaration=True)
print(f'Exported {len(rules)} Japanese aliases as JSON and PLS to {args.output}.')
