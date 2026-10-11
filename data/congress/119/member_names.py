"""Source-field-only display names; no member IDs, aliases or identity guesses."""
import re

def senate_display_name(first_name, last_name):
    if not isinstance(first_name,str) or not isinstance(last_name,str) or not first_name.strip() or not last_name.strip():
        raise ValueError('Official Senate first_name and last_name are required')
    suffix=re.fullmatch(r'([^,]+),\s*(Jr\.|Sr\.)',first_name)
    if suffix:
        return (suffix.group(1)+' '+last_name+', '+suffix.group(2),
                'exact first_name given-name component + last_name + original comma-delimited Jr./Sr. suffix')
    if ',' in first_name:
        raise ValueError('Unrecognized comma-delimited Senate first_name requires source review')
    return first_name+' '+last_name,'exact first_name + one space + exact last_name'
