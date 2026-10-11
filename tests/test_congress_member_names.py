import unittest,sys,pathlib,json,subprocess
ROOT=pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'data/congress/119'))
from member_names import senate_display_name

class CongressSourceNameTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.old=json.loads(subprocess.check_output(['git','show','c343237594bde7a2e3bd837fceaaae6abad9a072:data/congress/119/official-current-members.json'],cwd=ROOT))
        cls.new=json.loads((ROOT/'data/congress/119/official-current-members.json').read_text(encoding='utf-8'))
    def test_actual_retained_suffix_moves_after_actual_surname(self):
        row=next(r for r in self.old['members'] if r['bioguideId']=='K000383')
        e=row['nameEvidence'];self.assertEqual(e,{'firstName':'Angus S., Jr.','lastName':'King','memberFull':'King (I-ME)'})
        name,_=senate_display_name(e['firstName'],e['lastName']);self.assertEqual(name,'Angus S. King, Jr.')
        self.assertNotEqual(row['name'],name)
    def test_general_rule_has_no_identifier_or_alias_input(self):
        self.assertEqual(senate_display_name('Source Given, Sr.','Source Surname')[0],'Source Given Source Surname, Sr.')
        self.assertEqual(senate_display_name('Source Given','Source Surname')[0],'Source Given Source Surname')
    def test_missing_or_unrecognized_comma_fields_require_review(self):
        for first,last in [('', 'Source'),('Source',''),('Source, unknown','Surname')]:
            with self.assertRaises(ValueError):senate_display_name(first,last)
    def test_all539_identities_and_non_name_fields_are_conserved(self):
        before={r['bioguideId']:r for r in self.old['members']};after={r['bioguideId']:r for r in self.new['members']}
        self.assertEqual(len(after),539);self.assertEqual(before.keys(),after.keys());changed=[]
        for bid,row in before.items():
            other=after[bid]
            if row!=other:
                changed.append(bid);self.assertEqual([k for k in row if row[k]!=other[k]],['name','nameDerivation'])
            self.assertEqual({k:v for k,v in row.items() if k not in ['name','nameDerivation']},{k:v for k,v in other.items() if k not in ['name','nameDerivation']})
        self.assertEqual(changed,['K000383'])
    def test_all439_house_names_including12_jr_sr_values_are_unchanged(self):
        before=[r for r in self.old['members'] if r['chamber']=='House'];after=[r for r in self.new['members'] if r['chamber']=='House']
        self.assertEqual(len(before),439);self.assertEqual(before,after)
        self.assertEqual(sum(r['name'].endswith((', Jr.',', Sr.')) for r in before),11)
        self.assertEqual(sum('Jr.' in r['name'] or 'Sr.' in r['name'] for r in before),12)
    def test_every_senate_name_is_reproducible_from_actual_source_fields(self):
        for row in self.new['members']:
            if row['chamber']=='Senate':self.assertEqual(senate_display_name(row['nameEvidence']['firstName'],row['nameEvidence']['lastName']),(row['name'],row['nameDerivation']))

if __name__=='__main__':unittest.main()
