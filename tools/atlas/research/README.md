# Finding more recordings on Commons

These are the searches that produced tools/atlas/picks.json. They print candidates to a JSON file in the
current folder; nothing here touches the game. Pick by hand from the results, then add entries to picks.json
and run `python3 tools/atlas/build.py`.

- `inst_search.py`: one search per instrument name
- `world_search.py`: every file in "Category:Audio files of music of <country>"
- `search2.py`: targeted searches for missing instruments and music styles by place

Skip files named `LL-Q…` (word pronunciations) and anything whose title doesn't name the instrument or style.
