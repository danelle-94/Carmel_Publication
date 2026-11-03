# Adding or editing books (no coding needed)

All books live in one spreadsheet: [`books.csv`](books.csv). Open it in Excel, LibreOffice or Google Sheets.

## Steps

1. **Add a cover image** to the `catalog/covers/` folder (PNG or JPG), e.g. `science-explorer-4.png`.
2. **Add a row** at the bottom of `books.csv` and fill in the columns (see below).
3. **Save as CSV** (keep the format "CSV UTF-8").
4. **Run** this in a terminal from the project folder:

   ```bash
   python3 update_catalog.py
   ```

   It checks every row, resizes the covers, and rebuilds `js/data.js`. If something is wrong it tells you
   the row and the problem, and changes nothing. Use `python3 update_catalog.py --check` to only validate.
5. **Refresh the website.** Counts, filters, the Book Finder, search and the category pages update by themselves.

To **edit** a book change its row; to **remove** one delete its row. Then run step 4 again.

## Columns

| Column | Required | What to write |
|---|---|---|
| `id` | no | Short web name, e.g. `science-explorer-4`. Leave blank and it is made from the title. Don't change it later. |
| `title` | yes | Book title |
| `subtitle` | no | One-line subtitle |
| `category` | yes | Subject, e.g. `Mathematics & Numbers`. A new name creates a new category automatically. |
| `grade` | yes | `Nursery`, `LKG`, `UKG`, `Grade 1` ... `Grade 12`. Several grades: `Grade 4 / Grade 5`. A range: `Grade 6-8`. |
| `age_group` | no | e.g. `9 - 10 Years` |
| `collection` | no | Series name. A new name creates a new collection. Blank = same as category. |
| `isbn`, `year`, `format`, `pages` | no | Book details |
| `price` | yes | Number only, e.g. `250` (the rupee sign is added for you) |
| `rating` | no | e.g. `4.8` |
| `featured` | no | `yes` to show it first in the catalogue |
| `orientation` | no | Leave blank for portrait; write `landscape` for wide books |
| `description` | no | A few sentences about the book |
| `highlights` | no | Bullet points separated by `|`, e.g. `Clear diagrams | Practice questions` |
| `front_cover` | yes (new books) | File name in `catalog/covers/`, e.g. `science-explorer-4.png` |
| `full_cover` | no | Optional full jacket (back + spine + front) image shown in "Full cover" view and used for the 3D back. If blank the front cover is used. |

Existing books already have their covers, so `front_cover` can stay blank for them.

## Notes

- New categories get a default colour and icon. To give them a custom description or tagline, edit the entry in `js/data.js`
  (your edits there are kept, the script only rewrites the books list and the counts).
- Grades with no books are hidden from the Book Finder and filter automatically.
- Requires Python 3 with the Pillow package (`pip install pillow`).
