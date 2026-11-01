import os
import json
from PIL import Image

# Output dirs
os.makedirs('assets/covers/front', exist_ok=True)
os.makedirs('assets/covers/spread', exist_ok=True)
os.makedirs('assets/img', exist_ok=True)

# Clean up scratch files
for f in os.listdir('.'):
    if f.startswith('scratch_'):
        try: os.remove(f)
        except: pass

books_meta = [
    {
        "id": "alphabet-galaxy",
        "title": "Alphabet Galaxy",
        "subtitle": "An Illustrated Journey of Early Letters & Words",
        "source_cover": "Alphabet Galaxy-1.png",
        "source_pdf": "Alphabet Galaxy.pdf",
        "category": "Early Childhood & Alphabet",
        "category_slug": "early-childhood",
        "level": "Nursery / LKG",
        "age_group": "3 - 5 Years",
        "collection": "Foundation Series",
        "collection_slug": "foundation-series",
        "isbn": "978-81-17228-24-1",
        "year": "2024",
        "format": "Full Color Paperback (Jacketed)",
        "pages": 64,
        "price": "₹190",
        "featured": True,
        "rating": 4.9,
        "description": "Alphabet Galaxy takes young minds on an enchanting cosmic journey through letters A to Z. Each letter is brought to life with bold typography, phonetics-based word examples, and rich storytelling illustrations that foster natural word association.",
        "highlights": [
            "Comprehensive A to Z alphabet discovery",
            "Phonics-first sound recognition framework",
            "Vibrant, child-friendly illustrations",
            "Interactive trace-and-identify activities"
        ]
    },
    {
        "id": "pic-dic-abc-a",
        "title": "Picture Dictionary ABC – Book A",
        "subtitle": "First Words & Visual Cognitive Vocabulary",
        "source_cover": "Pic Dic ABC-1.png",
        "source_pdf": "Pic Dic ABC.pdf",
        "category": "Early Childhood & Alphabet",
        "category_slug": "early-childhood",
        "level": "Nursery / LKG",
        "age_group": "3 - 5 Years",
        "collection": "Visual Dictionary Series",
        "collection_slug": "visual-dictionary",
        "isbn": "978-81-17228-26-5",
        "year": "2024",
        "format": "Gloss Coated Paperback",
        "pages": 48,
        "price": "₹140",
        "featured": True,
        "rating": 4.8,
        "description": "A delightful foundational picture dictionary pairing high-contrast visual cues with core early words. Designed to help preschool children build early vocabulary, understand object classifications, and ignite speaking confidence.",
        "highlights": [
            "Over 180 everyday beginner vocabulary words",
            "Categorized into household items, animals, fruits, and vehicles",
            "High-contrast, eye-catching color reproduction",
            "Clear phonetic pronunciation guides"
        ]
    },
    {
        "id": "pic-dic-abc-b",
        "title": "Picture Dictionary ABC – Book B",
        "subtitle": "Thematic Vocabulary & World Exploration",
        "source_cover": "Pic Dic ABC-2.png",
        "source_pdf": "Pic Dic ABC.pdf",
        "category": "Early Childhood & Alphabet",
        "category_slug": "early-childhood",
        "level": "LKG / UKG",
        "age_group": "4 - 6 Years",
        "collection": "Visual Dictionary Series",
        "collection_slug": "visual-dictionary",
        "isbn": "978-81-17228-27-2",
        "year": "2024",
        "format": "Gloss Coated Paperback",
        "pages": 56,
        "price": "₹220",
        "featured": False,
        "rating": 4.9,
        "description": "Expanding on Book A, this volume invites children into wider community spheres, nature ecosystems, colors, seasons, and daily routines with rich contextual visual scenes.",
        "highlights": [
            "Thematic word clusters for rapid contextual recall",
            "Action verbs and descriptive adjective introductions",
            "Interactive 'Find and Name' observational spreads",
            "Bilingual terminology hints for early learners"
        ]
    },
    {
        "id": "pic-dic-abc-c",
        "title": "Picture Dictionary ABC – Book C",
        "subtitle": "Junior Encyclopedia of Words & Early Concepts",
        "source_cover": "Pic Dic ABC-3.png",
        "source_pdf": "Pic Dic ABC.pdf",
        "category": "Early Childhood & Alphabet",
        "category_slug": "early-childhood",
        "level": "UKG / Grade 1",
        "age_group": "5 - 7 Years",
        "collection": "Visual Dictionary Series",
        "collection_slug": "visual-dictionary",
        "isbn": "978-81-17228-28-9",
        "year": "2024",
        "format": "Gloss Coated Paperback",
        "pages": 64,
        "price": "₹240",
        "featured": False,
        "rating": 4.8,
        "description": "The capstone volume of Carmel's Picture Dictionary series, bridging word recognition into simple sentences, professions, geography, science basics, and creative self-expression.",
        "highlights": [
            "Sentence starter templates and descriptive phrasing",
            "Exploration of space, community helpers, and earth sciences",
            "Rich visual indexing promoting independent reading",
            "Ideal bridge from pre-primary to primary curriculum"
        ]
    },
    {
        "id": "word-book-foundation",
        "title": "Word Book (Introductory Edition)",
        "subtitle": "500 Essential Words for Beginning Readers",
        "source_cover": "word book cover-1.png",
        "source_pdf": "word book cover.pdf",
        "category": "Early Childhood & Alphabet",
        "category_slug": "early-childhood",
        "level": "Nursery / LKG",
        "age_group": "3 - 5 Years",
        "collection": "Foundation Series",
        "collection_slug": "foundation-series",
        "isbn": "978-81-17228-25-8",
        "year": "2024",
        "format": "Softcover Library Binding",
        "pages": 48,
        "price": "₹190",
        "featured": True,
        "rating": 4.9,
        "description": "Carefully selected 500 core vocabulary words for pre-readers and emergent speakers. Features crisp high-definition photography and charming illustrations grouped by natural conversational categories.",
        "highlights": [
            "500 foundational English words",
            "Clear visual categorization with colorful tabs",
            "High-durability laminated pages",
            "Parent-educator discussion tips on each spread"
        ]
    },
    {
        "id": "word-book-illustrated",
        "title": "My Illustrated Word Companion",
        "subtitle": "Everyday Situations, Objects & Story Starters",
        "source_cover": "word book-1.png",
        "source_pdf": "word book.pdf",
        "category": "Early Childhood & Alphabet",
        "category_slug": "early-childhood",
        "level": "Pre-Primary",
        "age_group": "3 - 6 Years",
        "collection": "Foundation Series",
        "collection_slug": "foundation-series",
        "isbn": "978-81-17228-25-9",
        "year": "2024",
        "format": "Paperback with Spot UV Cover",
        "pages": 44,
        "price": "₹180",
        "featured": False,
        "rating": 4.7,
        "description": "A delightful conversational picture book showing everyday scenes — breakfast time, the park, school classroom, doctor clinic — encouraging lively dialogue between child and adult.",
        "highlights": [
            "Immersive double-page scenic spreads",
            "Encourages question-and-answer comprehension",
            "Fosters expressive language and storytelling",
            "Child-friendly rounded corners"
        ]
    },
    {
        "id": "fun-with-numbers-1",
        "title": "Fun with Numbers – Book 1",
        "subtitle": "Counting, Number Recognition & Tracing (1 to 20)",
        "source_cover": "fun with numbers-1.png",
        "source_pdf": "fun with numbers.pdf",
        "category": "Mathematics & Numbers",
        "category_slug": "mathematics",
        "level": "Nursery / LKG",
        "age_group": "3 - 5 Years",
        "collection": "Little Thinkers Math",
        "collection_slug": "little-thinkers",
        "isbn": "978-81-980303-1-1",
        "year": "2024",
        "format": "Worksheet Edition with Activity Pages",
        "pages": 52,
        "price": "₹160",
        "featured": True,
        "rating": 4.9,
        "description": "A cheerful early numeracy book that makes numbers friendly and tangible. Introduces counting 1 to 20 through playful animal groups, finger-counting guides, and structured tracing exercises.",
        "highlights": [
            "Step-by-step number stroke formation arrows",
            "Object-to-numeral matching games",
            "Visual quantitative understanding (more/less, big/small)",
            "Engaging coloring and sticker-compatible pages"
        ]
    },
    {
        "id": "fun-with-numbers-2",
        "title": "Fun with Numbers – Book 2",
        "subtitle": "Sequencing, Grouping & Early Math Skills (1 to 100)",
        "source_cover": "fun with numbers-2.png",
        "source_pdf": "fun with numbers.pdf",
        "category": "Mathematics & Numbers",
        "category_slug": "mathematics",
        "level": "LKG / UKG",
        "age_group": "4 - 6 Years",
        "collection": "Little Thinkers Math",
        "collection_slug": "little-thinkers",
        "isbn": "978-81-980303-1-2",
        "year": "2024",
        "format": "Worksheet Edition with Activity Pages",
        "pages": 64,
        "price": "₹180",
        "featured": False,
        "rating": 4.8,
        "description": "Deepens mathematical foundation with skip-counting, number lines, patterns, simple single-digit additions using pictorial counters, and missing number logic puzzles.",
        "highlights": [
            "Comprehensive 1 to 100 number progression",
            "Skip counting in 2s, 5s, and 10s",
            "Early pictorial addition and subtraction",
            "Cognitive pattern completion exercises"
        ]
    },
    {
        "id": "cursive-writing-a",
        "title": "Cursive Writing – Book A",
        "subtitle": "Capital Letters & Foundation Strokes",
        "source_cover": "cursive cover abc-1.png",
        "source_pdf": "cursive cover abc.pdf",
        "category": "Handwriting & Penmanship",
        "category_slug": "handwriting",
        "level": "LKG / UKG",
        "age_group": "4 - 6 Years",
        "collection": "Pen & Ink Heritage",
        "collection_slug": "pen-heritage",
        "isbn": "978-81-980303-3-1",
        "year": "2024",
        "format": "Guided Four-Line Rulebook",
        "pages": 48,
        "price": "₹130",
        "featured": True,
        "rating": 4.9,
        "description": "Teaches the art of elegant cursive handwriting from the very beginning. Starts with preparatory curved loops, waves, and slant lines, leading smoothly into uppercase cursive letters with four-line guidelines.",
        "highlights": [
            "Scientific motor control warmup exercises",
            "Numbered directional stroke arrows",
            "Four-line precision ruling for consistent letter height",
            "Trace-and-write repetitive retention structure"
        ]
    },
    {
        "id": "cursive-writing-b",
        "title": "Cursive Writing – Book B",
        "subtitle": "Small Letters & Fluent Joining Strokes",
        "source_cover": "cursive cover abc-2.png",
        "source_pdf": "cursive cover abc.pdf",
        "category": "Handwriting & Penmanship",
        "category_slug": "handwriting",
        "level": "UKG",
        "age_group": "5 - 6 Years",
        "collection": "Pen & Ink Heritage",
        "collection_slug": "pen-heritage",
        "isbn": "978-81-980303-3-2",
        "year": "2024",
        "format": "Guided Four-Line Rulebook",
        "pages": 48,
        "price": "₹130",
        "featured": False,
        "rating": 4.8,
        "description": "Focuses on lowercase cursive letter mastery, emphasizing fluid entry and exit strokes so letters can connect effortlessly into graceful two-letter and three-letter words.",
        "highlights": [
            "Lowercase letters grouped by common baseline curves",
            "Transition into 2-letter and 3-letter joined words",
            "Correct pencil grip and hand posture tips",
            "High-grade ink-bleed resistant paper"
        ]
    },
    {
        "id": "cursive-writing-c",
        "title": "Cursive Writing – Book C",
        "subtitle": "Words, Expressive Sentences & Paragraphs",
        "source_cover": "cursive cover abc-3.png",
        "source_pdf": "cursive cover abc.pdf",
        "category": "Handwriting & Penmanship",
        "category_slug": "handwriting",
        "level": "Grade 1",
        "age_group": "6 - 7 Years",
        "collection": "Pen & Ink Heritage",
        "collection_slug": "pen-heritage",
        "isbn": "978-81-980303-3-3",
        "year": "2024",
        "format": "Guided Four-Line Rulebook",
        "pages": 56,
        "price": "₹140",
        "featured": False,
        "rating": 4.8,
        "description": "Transforms acquired cursive skills into rhythmic, fluent writing through inspiring moral quotes, nature passages, and structured creative paragraph copying.",
        "highlights": [
            "Spacing, punctuation, and margin alignment mastery",
            "Inspiring quotes and classic prose snippets",
            "Transition from guided 4-line to open double-line",
            "Builds speed and legibility simultaneously"
        ]
    },
    {
        "id": "meri-swar-mala",
        "title": "Meri Swar Mala (मेरी स्वर माला)",
        "subtitle": "Hindi Vowels with Vibrant Visuals & Pronunciation",
        "source_cover": "meri swar mala-1.png",
        "source_pdf": "meri swar mala.pdf",
        "category": "Hindi Language & Literature",
        "category_slug": "hindi-literature",
        "level": "Nursery / LKG",
        "age_group": "3 - 5 Years",
        "collection": "Bhasha Gyan Series",
        "collection_slug": "bhasha-gyan",
        "isbn": "978-81-980303-4-1",
        "year": "2024",
        "format": "Full Color Varnamala Edition",
        "pages": 40,
        "price": "₹150",
        "featured": True,
        "rating": 4.9,
        "description": "An enchanting introduction to Devnagari vowels (स्वर: अ से अः). Every swar is celebrated with traditional and contemporary illustrations, catchy poetic couplets, and phonetic articulation guides.",
        "highlights": [
            "Complete Hindi Swar presentation (अ to अः)",
            "Multiple everyday word examples for every vowel",
            "Clear stroke order diagrams for Devnagari script",
            "Musical couplets helping auditory memory retention"
        ]
    },
    {
        "id": "meri-shabad-mala",
        "title": "Meri Shabad Mala (मेरी शब्द माला)",
        "subtitle": "Hindi Consonants & Early Word Formation",
        "source_cover": "meri shabad mala-1.png",
        "source_pdf": "meri shabad mala.pdf",
        "category": "Hindi Language & Literature",
        "category_slug": "hindi-literature",
        "level": "LKG / UKG",
        "age_group": "4 - 6 Years",
        "collection": "Bhasha Gyan Series",
        "collection_slug": "bhasha-gyan",
        "isbn": "978-81-980303-4-2",
        "year": "2024",
        "format": "Full Color Varnamala Edition",
        "pages": 52,
        "price": "₹170",
        "featured": False,
        "rating": 4.8,
        "description": "Takes the young Hindi learner forward from consonants (व्यंजन: क से ज्ञ) to matra-free two, three, and four-letter words, simple sentences, and delightful reading practice.",
        "highlights": [
            "Complete Devnagari Vyanjan (क से ज्ञ)",
            "Two-letter, three-letter, and four-letter word building",
            "Reading exercises with contextual picture clues",
            "Interactive exercises matching words to objects"
        ]
    },
    {
        "id": "rhymes-balgeet-a",
        "title": "Rhymes & Balgeet – Book A",
        "subtitle": "Bilingual Action Rhymes & Melody Songs",
        "source_cover": "Rhymes & Balgeet-1.png",
        "source_pdf": "Rhymes & Balgeet.pdf",
        "category": "Rhymes, Poetry & Songs",
        "category_slug": "rhymes-poetry",
        "level": "Nursery",
        "age_group": "2 - 4 Years",
        "collection": "Melody & Verse",
        "collection_slug": "melody-verse",
        "isbn": "978-81-980303-5-1",
        "year": "2024",
        "format": "Oversized Illustrated Anthology",
        "pages": 44,
        "price": "₹160",
        "featured": True,
        "rating": 4.9,
        "description": "An adorable treasure trove of timeless English nursery rhymes paired alongside heartwarming Hindi Balgeet. Features full-page colorful art, hand-action guides, and lyrical rhythm.",
        "highlights": [
            "Dual-language compilation (English rhymes & Hindi Balgeet)",
            "Action cue diagrams for physical movement and motor joy",
            "High-contrast expressive character design",
            "Great for choral recitation and parent-child bonding"
        ]
    },
    {
        "id": "rhymes-balgeet-b",
        "title": "Rhymes & Balgeet – Book B",
        "subtitle": "Playful Songs, Animal Melodies & Movement Verse",
        "source_cover": "Rhymes & Balgeet-2.png",
        "source_pdf": "Rhymes & Balgeet.pdf",
        "category": "Rhymes, Poetry & Songs",
        "category_slug": "rhymes-poetry",
        "level": "LKG",
        "age_group": "3 - 5 Years",
        "collection": "Melody & Verse",
        "collection_slug": "melody-verse",
        "isbn": "978-81-980303-5-2",
        "year": "2024",
        "format": "Oversized Illustrated Anthology",
        "pages": 48,
        "price": "₹170",
        "featured": False,
        "rating": 4.8,
        "description": "Fun-filled rhymes celebrating nature, animals, and friendly characters. Rhythm patterns designed to enrich phonemic sensitivity and spoken rhythm in preschool children.",
        "highlights": [
            "Rhyme themes around birds, animals, rain, and trains",
            "Engaging rhythm beats marked for clapping along",
            "Bilingual cultural balance with beloved folklore",
            "Large readable typography for early sight reading"
        ]
    },
    {
        "id": "rhymes-balgeet-c",
        "title": "Rhymes & Balgeet – Book C",
        "subtitle": "Character Rhymes, Story Songs & Storytelling Verse",
        "source_cover": "Rhymes & Balgeet-3.png",
        "source_pdf": "Rhymes & Balgeet.pdf",
        "category": "Rhymes, Poetry & Songs",
        "category_slug": "rhymes-poetry",
        "level": "UKG",
        "age_group": "4 - 6 Years",
        "collection": "Melody & Verse",
        "collection_slug": "melody-verse",
        "isbn": "978-81-980303-5-3",
        "year": "2024",
        "format": "Oversized Illustrated Anthology",
        "pages": 48,
        "price": "₹170",
        "featured": False,
        "rating": 4.9,
        "description": "Engaging storytelling verses that narrate miniature moral fables through song. Builds vocabulary, poetic rhythm, and emotional resonance in young performers.",
        "highlights": [
            "Story poems introducing plot and character arc",
            "Expressive illustrations sparking dramatic imagination",
            "Rhythmic choruses easy for whole-class recitation",
            "Bilingual Hindi-English narrative pairing"
        ]
    },
    {
        "id": "rhymes-balgeet-d",
        "title": "Rhymes & Balgeet – Book D",
        "subtitle": "Folk Ballads, Seasonal Rhymes & Joyful Stanzas",
        "source_cover": "Rhymes & Balgeet-4.png",
        "source_pdf": "Rhymes & Balgeet.pdf",
        "category": "Rhymes, Poetry & Songs",
        "category_slug": "rhymes-poetry",
        "level": "UKG / Grade 1",
        "age_group": "5 - 7 Years",
        "collection": "Melody & Verse",
        "collection_slug": "melody-verse",
        "isbn": "978-81-980303-5-4",
        "year": "2024",
        "format": "Oversized Illustrated Anthology",
        "pages": 52,
        "price": "₹180",
        "featured": False,
        "rating": 4.8,
        "description": "Traditional folk songs, festival chants, and seasonal celebrations capturing the monsoon, spring flowers, and community joys in both English and Hindi.",
        "highlights": [
            "Celebration of Indian festivals, seasons, and flora",
            "Lyrical cadence enhancing memory and spoken confidence",
            "Illustrated vocabulary notes for new words",
            "Ideal for school cultural assemblies and events"
        ]
    },
    {
        "id": "rhymes-balgeet-e",
        "title": "Rhymes & Balgeet – Book E",
        "subtitle": "Lyrical Poems, Drama & Musical Playlets",
        "source_cover": "Rhymes & Balgeet-5.png",
        "source_pdf": "Rhymes & Balgeet.pdf",
        "category": "Rhymes, Poetry & Songs",
        "category_slug": "rhymes-poetry",
        "level": "Grade 1",
        "age_group": "6 - 7 Years",
        "collection": "Melody & Verse",
        "collection_slug": "melody-verse",
        "isbn": "978-81-980303-5-5",
        "year": "2024",
        "format": "Oversized Illustrated Anthology",
        "pages": 56,
        "price": "₹190",
        "featured": False,
        "rating": 4.9,
        "description": "Extended poetic verse and miniature musical playlets for primary school learners, teaching voice modulation, stage confidence, and poetic cadence.",
        "highlights": [
            "Role-play scripts and dialogues in rhyming verse",
            "Advanced rhythmic meters introducing poetic forms",
            "Full-spread narrative artwork",
            "Pronunciation and phonetic clarity cues"
        ]
    },
    {
        "id": "rhymes-balgeet-f",
        "title": "Rhymes & Balgeet – Book F",
        "subtitle": "Classic Children's Poetic Anthology",
        "source_cover": "Rhymes & Balgeet-6.png",
        "source_pdf": "Rhymes & Balgeet.pdf",
        "category": "Rhymes, Poetry & Songs",
        "category_slug": "rhymes-poetry",
        "level": "Grade 2",
        "age_group": "6 - 8 Years",
        "collection": "Melody & Verse",
        "collection_slug": "melody-verse",
        "isbn": "978-81-980303-5-6",
        "year": "2024",
        "format": "Oversized Illustrated Anthology",
        "pages": 60,
        "price": "₹200",
        "featured": False,
        "rating": 4.9,
        "description": "The crowning volume of Carmel's Rhymes collection featuring acclaimed literary poems for children, humorous limericks, thought-provoking verses, and festive songs.",
        "highlights": [
            "Anthology of classic and modern children's poetry",
            "Introduces metaphors, onomatopoeia, and rhyme schemes",
            "Artistic editorial compositions",
            "Inspires creative verse writing among children"
        ]
    },
    {
        "id": "art-craft-a",
        "title": "Fun with Art and Craft – Book A",
        "subtitle": "Sensory Exploration, Finger Impression & Colors",
        "source_cover": "cover part a-1.png",
        "source_pdf": "cover part a.pdf",
        "category": "Art, Craft & Creativity",
        "category_slug": "art-craft",
        "level": "Nursery",
        "age_group": "3 - 4 Years",
        "collection": "Creative Canvas",
        "collection_slug": "creative-canvas",
        "isbn": "978-81-980303-6-1",
        "year": "2024",
        "format": "Landscape Drawing Pad with Perforated Sheets",
        "pages": 40,
        "price": "₹150",
        "featured": True,
        "rating": 4.9,
        "description": "A sensory-rich artistic playground for the youngest creators. Introduces thumb printing, potato stamping, paper tearing, cotton wool pasting, and broad crayon coloring.",
        "highlights": [
            "Tactile tactile-development activities (paste, tear, dab)",
            "Thick heavy-gauge drawing paper prevents bleed-through",
            "Bold thick outline boundaries for early coloring success",
            "Includes non-toxic activity ideas using everyday materials"
        ]
    },
    {
        "id": "art-craft-b",
        "title": "Fun with Art and Craft – Book B",
        "subtitle": "Origami Basics, Crayon Blending & Shape Art",
        "source_cover": "cover part b-1.png",
        "source_pdf": "cover part b.pdf",
        "category": "Art, Craft & Creativity",
        "category_slug": "art-craft",
        "level": "LKG",
        "age_group": "4 - 5 Years",
        "collection": "Creative Canvas",
        "collection_slug": "creative-canvas",
        "isbn": "978-81-980303-6-2",
        "year": "2024",
        "format": "Landscape Drawing Pad with Perforated Sheets",
        "pages": 44,
        "price": "₹160",
        "featured": False,
        "rating": 4.8,
        "description": "Nurtures budding imagination through simple 3-step paper folding, leaf printing, wax crayon rubbing, and geometric shape drawing puzzles.",
        "highlights": [
            "Easy beginner origami with visual step-by-step guides",
            "Texture rubbing and leaf imprint explorations",
            "Color mixing discoveries (blue + yellow = green)",
            "Tear-out exhibition sheets for home display"
        ]
    },
    {
        "id": "art-craft-c",
        "title": "Fun with Art and Craft – Book C",
        "subtitle": "Mixed Media, Wool Pasting & Paper Craft",
        "source_cover": "cover part c-1.png",
        "source_pdf": "cover part c.pdf",
        "category": "Art, Craft & Creativity",
        "category_slug": "art-craft",
        "level": "UKG",
        "age_group": "5 - 6 Years",
        "collection": "Creative Canvas",
        "collection_slug": "creative-canvas",
        "isbn": "978-81-980303-6-3",
        "year": "2024",
        "format": "Landscape Drawing Pad with Perforated Sheets",
        "pages": 48,
        "price": "₹170",
        "featured": False,
        "rating": 4.9,
        "description": "Takes young craftspeople into vibrant mixed-media creativity: wool threading, glitter highlights, grain & pulse collage, and puppet craft.",
        "highlights": [
            "Hand puppet and paper crown craft templates",
            "Collage making using eco-friendly natural materials",
            "Introduction to symmetrical butterfly folding art",
            "Encourages fine-motor agility and spatial planning"
        ]
    },
    {
        "id": "art-craft-1",
        "title": "Fun with Art and Craft – Part 1",
        "subtitle": "Watercolors, Clay Modeling & Festive Cards",
        "source_cover": "cover part 1-1.png",
        "source_pdf": "cover part 1.pdf",
        "category": "Art, Craft & Creativity",
        "category_slug": "art-craft",
        "level": "Grade 1",
        "age_group": "6 - 7 Years",
        "collection": "Creative Canvas",
        "collection_slug": "creative-canvas",
        "isbn": "978-81-980303-6-4",
        "year": "2024",
        "format": "Landscape Art Studio Edition",
        "pages": 48,
        "price": "₹180",
        "featured": True,
        "rating": 4.9,
        "description": "Primary-level creative workbook teaching color wash techniques, playdough and clay modeling, handmade festive greeting cards, and blow-painting fun.",
        "highlights": [
            "Step-by-step watercolor shading and wash tutorials",
            "Clay modeling animal guides with proportion tips",
            "Festive DIY greeting cards and pop-up surprises",
            "Artistic confidence-building creative prompts"
        ]
    },
    {
        "id": "art-craft-2",
        "title": "Fun with Art and Craft – Part 2",
        "subtitle": "Landscape Sketching, Stencil Art & Upcycling",
        "source_cover": "cover part 2-1.png",
        "source_pdf": "cover part 2.pdf",
        "category": "Art, Craft & Creativity",
        "category_slug": "art-craft",
        "level": "Grade 2",
        "age_group": "7 - 8 Years",
        "collection": "Creative Canvas",
        "collection_slug": "creative-canvas",
        "isbn": "978-81-980303-6-5",
        "year": "2024",
        "format": "Landscape Art Studio Edition",
        "pages": 52,
        "price": "₹190",
        "featured": False,
        "rating": 4.8,
        "description": "Progressive artistic principles: horizon lines, pencil shading, stencil silhouette spray, paper quilling basics, and recycling everyday cardboard into art.",
        "highlights": [
            "Landscape and nature perspective tutorials",
            "Toothbrush spray painting and stencil art",
            "Eco-friendly 'Best Out of Waste' craft projects",
            "Sharp, vivid color palette inspiration charts"
        ]
    },
    {
        "id": "art-craft-3",
        "title": "Fun with Art and Craft – Part 3",
        "subtitle": "Masterclass Junior: 3D Paper Sculptures & Canvas Art",
        "source_cover": "cover part 3-1.png",
        "source_pdf": "cover part 3.pdf",
        "category": "Art, Craft & Creativity",
        "category_slug": "art-craft",
        "level": "Grade 3",
        "age_group": "8 - 10 Years",
        "collection": "Creative Canvas",
        "collection_slug": "creative-canvas",
        "isbn": "978-81-980303-6-6",
        "year": "2024",
        "format": "Landscape Art Studio Edition",
        "pages": 56,
        "price": "₹210",
        "featured": False,
        "rating": 4.9,
        "description": "The senior level art and craft curriculum: acrylic canvas miniatures, 3D paper engineering, geometric mandala drawing, and glass-painting imitation.",
        "highlights": [
            "3D pop-up architectural paper engineering",
            "Mandala patterns and mindfulness art exercises",
            "Acrylic and poster color brush techniques",
            "Showcase portfolio preparation for young artists"
        ]
    }
]

print(f"Processing {len(books_meta)} books...")

for book in books_meta:
    src_path = os.path.join('books_image/all_covers', book['source_cover'])
    if not os.path.exists(src_path):
        print(f"Warning: {src_path} not found!")
        continue
    
    im = Image.open(src_path)
    w, h = im.size
    ratio = w / h
    
    # Crop Front Cover
    if ratio > 2.0: # Landscape format art & craft
        front = im.crop((int(w * 0.512), 0, w, h))
        target_front_w = 540
    else: # Portrait format
        front = im.crop((int(w * 0.515), 0, w, h))
        target_front_w = 480
        
    target_front_h = int(target_front_w * front.height / front.width)
    front_resized = front.resize((target_front_w, target_front_h), Image.Resampling.LANCZOS).convert('RGB')
    
    front_jpg_path = f"assets/covers/front/{book['id']}.jpg"
    front_webp_path = f"assets/covers/front/{book['id']}.webp"
    front_resized.save(front_jpg_path, 'JPEG', quality=88, optimize=True)
    front_resized.save(front_webp_path, 'WEBP', quality=88)
    
    # Save optimized Full Spread for preview/flip
    target_spread_w = 1200
    target_spread_h = int(target_spread_w * h / w)
    spread_resized = im.resize((target_spread_w, target_spread_h), Image.Resampling.LANCZOS).convert('RGB')
    
    spread_jpg_path = f"assets/covers/spread/{book['id']}.jpg"
    spread_webp_path = f"assets/covers/spread/{book['id']}.webp"
    spread_resized.save(spread_jpg_path, 'JPEG', quality=85, optimize=True)
    spread_resized.save(spread_webp_path, 'WEBP', quality=85)
    
    book['cover_front_jpg'] = front_jpg_path
    book['cover_front_webp'] = front_webp_path
    book['cover_spread_jpg'] = spread_jpg_path
    book['cover_spread_webp'] = spread_webp_path
    book['cover_pdf'] = f"books_image/{book['source_pdf']}"
    book['aspect_type'] = 'landscape' if ratio > 2.0 else 'portrait'

# Save JSON metadata
with open('assets/books.json', 'w', encoding='utf-8') as f:
    json.dump(books_meta, f, indent=2, ensure_ascii=False)

print(f"Successfully processed all {len(books_meta)} books and created assets/books.json!")
