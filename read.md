# FUNCTIONAL DESIGN (FD)

# Modern Book Publishing Catalogue Website

**Version:** 2.0
**Project Type:** Book Publishing Brand Website and Interactive Digital Catalogue
**Primary Objective:** Create a vibrant, modern and visually engaging publishing website for showcasing a publisher's books and collections.

---

# 1. Project Vision

## 1.1 Objective

Build a premium digital presence for a book publishing company that showcases its publishing identity, book collections, latest releases and editorial work through an interactive visual catalogue.

The website should feel like a combination of:

- A contemporary publishing house.
- A premium editorial magazine.
- A curated digital book gallery.
- An interactive library of published works.

The website is primarily intended for discovering and exploring books visually.

It is NOT a school-specific website, textbook management platform, or online bookstore.

## 1.2 Core Experience

Visitors should be able to:

1. Discover the publisher and its brand identity.
2. Explore visually appealing book collections.
3. Browse books by category, genre, collection or publication.
4. Search the catalogue.
5. Filter and sort books interactively.
6. Open a book preview or expanded information panel.
7. Explore curated collections and featured publications.
8. Navigate smoothly between the homepage and catalogue.
9. View the website comfortably on desktop, tablet and mobile.

## 1.3 Explicit Scope Restrictions

Do not implement the following unless requested separately:

- School-specific features.
- Class or grade filters.
- Curriculum board filters.
- School accounts.
- Teacher portals.
- Student accounts.
- School order management.
- Shopping carts.
- Online payments.
- Checkout.
- Inventory management.
- Shipping workflows.
- Complex book detail pages intended for online purchasing.

The catalogue is for visual discovery and publisher presentation, not transactions.

---

# 2. Design Direction

## 2.1 Visual Identity

Create a bold, vibrant, modern and editorial visual experience.

The design should combine the elegance of a premium publishing house with the energy of a contemporary creative brand.

Avoid generic corporate website templates and conventional e-commerce layouts.

### Design characteristics

- Large, confident typography.
- Colorful, high-quality book-cover imagery.
- Editorial-style compositions.
- Generous whitespace balanced with bold color.
- Asymmetric layouts where appropriate.
- Rounded cards used selectively.
- Soft gradients and subtle decorative elements.
- Refined hover animations.
- Smooth transitions between interface states.
- Strong visual hierarchy.
- Distinctive section backgrounds.
- Consistent spacing and alignment.

### Suggested color palette

Use this palette as a starting point and refine it into a cohesive design system.

| Purpose       | Color                    |
| ------------- | ------------------------ |
| Primary       | Electric Blue — #3155E7 |
| Secondary     | Tangerine — #FF8A3D     |
| Accent        | Bright Lime — #D7F45B   |
| Highlight     | Lavender — #C8B7FF      |
| Background    | Warm White — #FAF9F6    |
| Text          | Deep Ink — #171923      |
| Dark Sections | Midnight Navy — #171C3A |

Use bright colors strategically. The website should remain readable and sophisticated rather than becoming visually overwhelming.

## 2.2 Typography

Use a modern display typeface for headings and a highly readable typeface for body text.

Recommended combinations:

- Manrope + Inter.
- Plus Jakarta Sans + Inter.
- Space Grotesk + DM Sans.

Requirements:

- Strong visual hierarchy.
- Responsive typography.
- Comfortable body-text readability.
- Consistent font weights and line heights.
- Avoid excessive use of all-caps text.

## 2.3 Animation and Interaction

Implement subtle, purposeful animations.

Examples:

- Book covers lift slightly on hover.
- Featured book imagery reveals additional visual detail.
- Category cards respond to pointer hover.
- Search opens a focused search interface.
- Filter selections animate smoothly.
- Catalogue layouts transition without unnecessary visual jumps.
- Navigation links have refined hover states.
- Sections use restrained entrance animations.
- Mobile interactions remain touch-friendly.

Use CSS transitions or lightweight animation libraries where justified.

Respect the user's reduced-motion preference.

Avoid excessive parallax, constant movement and animations that interfere with reading.

---

# 3. Global Navigation

## 3.1 Header

Create a modern, responsive header containing:

- Publisher logo.
- Home.
- Catalogue.
- Collections.
- Latest Releases.
- About the Publisher.
- Search icon.
- Contact link, if required.

Include a distinctive CTA such as "Explore Catalogue".

The header may be transparent or integrated into the hero section at the top of the homepage, becoming solid or sticky when appropriate.

## 3.2 Navigation Behaviour

- Clicking the logo returns to the homepage.
- Catalogue opens the full book catalogue.
- Collections opens curated book collections.
- Latest Releases navigates to the latest publications section or a dedicated listing.
- About the Publisher opens the publisher information page or section.
- Search opens a search overlay or expandable search panel.
- Mobile navigation opens in an accessible drawer or menu.

Maintain a clear active state for the current page.

## 3.3 Footer

Include:

- Publisher logo.
- Short brand statement.
- Catalogue navigation.
- Collection links.
- About section.
- Contact and social links, if provided.
- Copyright information.

All company-specific information must be supplied by the publisher.

Do not invent awards, partnerships, statistics or publishing credentials.

---

# 4. Module A — Publishing Homepage

## 4.1 Purpose

Create a visually distinctive introduction to the publishing brand and encourage visitors to explore its catalogue.

The homepage should function as a visual showcase rather than a long corporate information page.

## 4.2 Hero Section

Create a bold, editorial hero section with:

- Publisher name and logo.
- An impactful headline.
- A short brand description.
- Primary CTA: Explore the Catalogue.
- Secondary CTA: Discover Latest Releases.
- A large, visually striking composition of book covers.

Suggested placeholder headline:

"Stories, Ideas & Worlds Between Covers."

Suggested supporting text:

"Explore a world of published works, thoughtfully curated collections and books created to inspire curiosity."

These are placeholder copy examples and must be replaceable with the publisher's actual branding.

### Visual direction

The hero should feature a creative arrangement of book covers with different sizes, rotations or layered positioning.

Use real publisher-supplied covers whenever available.

Do not generate fake book titles or invent publishing credentials.

### Functional behaviour

- Explore the Catalogue navigates to the catalogue page.
- Discover Latest Releases scrolls to the relevant section or opens the releases page.
- Book-cover elements can link to their corresponding catalogue previews where appropriate.

## 4.3 Featured Publications

Display a visually rich selection of featured books.

Each item may include:

- Book cover.
- Title.
- Author, if available.
- Category or genre.
- Collection name, if applicable.

Use varied card sizes or an editorial grid to create visual interest.

Do not use a repetitive generic product-grid layout for every homepage section.

Clicking a book opens its preview panel or book information modal.

## 4.4 Browse by Category

Display the categories configured by the publisher.

Examples, depending on the actual catalogue:

- Fiction.
- Non-fiction.
- Literature.
- Children's Books.
- Art and Design.
- History.
- Poetry.
- Reference.
- Other publisher-defined categories.

These are examples only. Administrators must be able to configure the real categories.

### Category card behaviour

Each card contains:

- Category name.
- Optional category description.
- Optional representative image.
- Optional number of books.

On click:

1. Navigate to the catalogue.
2. Apply the selected category filter.
3. Display the matching books.
4. Show the active filter and result count.

## 4.5 Latest Releases

Show recently released publications using verified publication dates.

Each card contains:

- Cover image.
- Title.
- Author, if available.
- Publication year, if available.
- Category.

Clicking a card opens its book preview.

Provide a "View All Releases" link to a dedicated listing or appropriately filtered catalogue.

## 4.6 Featured Collections

Create an editorial section for curated groups of books.

Examples:

- Editor's Picks.
- New Voices.
- Best of the Collection.
- Seasonal Selections.
- Publisher Highlights.

Collection names and content must be configurable.

Each collection includes:

- Collection title.
- Introductory description.
- Representative book covers.
- Explore Collection CTA.

On click, open the catalogue with the corresponding collection selected.

## 4.7 Publisher Introduction

Display a short introduction explaining the publisher's identity, vision and editorial approach.

Include an optional image, editorial illustration or publishing-related visual.

Provide a link to About the Publisher.

All factual claims must be supplied or approved by the publisher.

## 4.8 Final Call to Action

Create a distinctive closing section encouraging visitors to explore the complete catalogue.

Use a contrasting background and strong typography.

The CTA must navigate to the catalogue.

---

# 5. Module B — Interactive Book Catalogue

## 5.1 Purpose

Create an attractive digital catalogue where visitors can explore the publisher's complete collection without purchasing books directly through the website.

## 5.2 Catalogue Page Layout

The page must include:

1. Breadcrumb navigation.
2. Catalogue heading.
3. Short introduction.
4. Search field.
5. Category filters.
6. Optional collection filters.
7. Optional author filters.
8. Optional publication-year filters.
9. Sort control.
10. Result count.
11. Responsive book-cover grid.
12. Pagination or load-more control.
13. Empty and error states.

The design should prioritize the books themselves.

Filters should remain visually compact and must not dominate the interface.

## 5.3 Search

Visitors can search by:

- Book title.
- Author.
- ISBN, if available.
- Collection.
- Category.

### Search behaviour

- Search should be case-insensitive.
- Trim unnecessary whitespace.
- Support partial title and author matches.
- Normalize ISBN input when searching.
- Update results after submission or using a short debounce.
- Display a clear-search action.
- Show a helpful empty state when there are no matches.

Search must operate on the actual catalogue dataset.

## 5.4 Filters

Implement configurable filters.

### Category

Filter books by publisher-defined categories.

### Collection

Filter books belonging to a specific curated collection.

### Author

Filter by author where author data is available.

### Publication Year

Filter by publication year where the date is available.

### Optional Future Filters

- Language.
- Publisher imprint.
- Format.
- Genre.
- Availability of a public preview.

Only display a filter if its corresponding data exists and the publisher enables it.

Do not display school-specific filters.

## 5.5 Combined Filtering

Filters must work together.

Example:

Category = Fiction
Collection = Editor's Picks
Publication Year = 2026

Expected result:

Show only published books that match all selected filter groups.

Within a multi-select filter, matching any selected value in that group is sufficient.

Requirements:

- Update the result count.
- Display active filter chips.
- Allow individual filter removal.
- Provide Clear All.
- Reset pagination when filters change.
- Preserve other selected filters when one filter is removed.
- Maintain a consistent loading and empty state.

## 5.6 Sorting

Provide:

- Featured.
- Newest First.
- Title A–Z.
- Title Z–A.
- Publication Date, Newest First.

Featured ordering must follow publisher-defined ranking.

Use deterministic sorting to avoid unstable results.

## 5.7 Book Grid

Use a responsive editorial grid.

Suggested layout:

- Desktop: 4–5 books per row, depending on screen width.
- Tablet: 2–3 books per row.
- Mobile: 2 books per row where practical, or a single column where the design requires larger cards.

Each card includes:

- Book cover.
- Title.
- Author, if available.
- Category or genre.
- Publication year, if available.
- Optional collection label.

Keep cover images prominent.

Avoid unnecessary product-style information such as purchase buttons, stock quantities, shipping details and pricing.

## 5.8 Hover Behaviour

On desktop:

- Slightly elevate the cover or card.
- Reveal a subtle action such as "Quick View".
- Apply restrained shadow or image transitions.
- Keep the title and key metadata readable.

On touch devices:

- Do not rely on hover to reveal essential controls.
- Provide a visible preview action or make the card itself interactive.

## 5.9 Pagination

Provide either pagination or a load-more interaction, selecting the option that best fits the final design.

Requirements:

- Use a sensible default page size, such as 20 books.
- Avoid rendering the entire catalogue at once for large datasets.
- Preserve current filters and sorting.
- Display an appropriate loading state.
- Ensure new results are appended correctly if using Load More.

## 5.10 URL State

Synchronize search and filter state with URL query parameters.

Example:

/catalogue?category=fiction&collection=editors-picks&year=2026

Requirements:

- Reloading the URL restores the active filters.
- Filtered pages can be shared.
- Browser Back and Forward restore prior states.
- Invalid filter values are handled gracefully.
- Use clean, readable URLs.

---

# 6. Module C — Quick Book Preview

## 6.1 Purpose

Let visitors inspect a book without navigating away from the catalogue.

This is a lightweight interaction, not a dedicated e-commerce product page.

## 6.2 Preview Presentation

Use an accessible modal, drawer or overlay.

Display:

- Large book-cover image.
- Book title.
- Author, if available.
- Category or genre.
- Collection, if applicable.
- Publication year, if available.
- Short description, if available.
- ISBN, if available.
- Optional publisher-approved preview link.

## 6.3 Interactions

- Open the preview by clicking a book card.
- Close using a visible close button.
- Support Escape to close.
- Support appropriate focus management.
- Restore focus to the triggering card when closed.
- Prevent accidental background interaction while modal focus is active.
- Provide a "Back to Catalogue" or equivalent navigation path.
- Ensure the preview works on touch devices.

If the publisher has no description or preview resource for a book, omit those sections rather than displaying invented information.

## 6.4 Preview Links

If the publisher provides a public sample or external information page, display a relevant action.

Do not implement shopping, checkout or payment functionality.

---

# 7. Module D — Collections

## 7.1 Purpose

Present books in curated groups with a distinct editorial identity.

## 7.2 Collection Listing

Each collection may contain:

- Name.
- Slug.
- Description.
- Cover image or collage.
- Featured status.
- Ordered list of books.

## 7.3 Collection Interaction

Clicking a collection opens its dedicated collection view or the catalogue with that collection selected.

The collection view should:

- Display the collection title and description.
- Showcase representative book covers.
- List all books in the collection.
- Preserve the publisher-defined book order where applicable.

Collections must be manageable through the content-management system.

---

# 8. Content Management

Provide a lightweight administration interface through the selected CMS.

Administrators must be able to:

- Create and edit books.
- Upload book-cover images.
- Update titles and descriptions.
- Manage authors and categories.
- Configure collections.
- Set featured status and ordering.
- Maintain publication dates and ISBNs.
- Publish or unpublish books.
- Manage homepage featured publications.
- Update homepage text and brand imagery.

Do not build a complex inventory or order-management system.

Administrative functions must be authenticated and protected by server-side access control.

---

# 9. Data Model

## 9.1 Book

Fields:

- id
- title
- slug
- coverImage
- description
- author
- ISBN
- categoryIds
- collectionIds
- publicationDate
- publicationYear
- featured
- featuredOrder
- status
- externalPreviewUrl, optional
- createdAt
- updatedAt

Fields such as author, ISBN and publication date may be optional.

## 9.2 Category

Fields:

- id
- name
- slug
- description
- image, optional
- displayOrder
- status

## 9.3 Collection

Fields:

- id
- name
- slug
- description
- coverImage
- bookIds
- featured
- displayOrder
- status

## 9.4 Publisher Content

Manage:

- Publisher name and logo.
- Brand tagline.
- Homepage hero text.
- Homepage hero imagery.
- Featured books.
- Featured collections.
- About section.
- Contact links.
- Social links.

Avoid hardcoding business-specific copy into components.

---

# 10. Recommended Technical Stack

Use the following stack unless repository research identifies a clear reason to change it.

### Frontend

- Next.js.
- React.
- TypeScript.
- Tailwind CSS.
- shadcn/ui for accessible UI primitives.

### Animation

- CSS transitions for simple interactions.
- Framer Motion or Motion for more advanced transitions where useful.

### Content Management

- Payload CMS or a justified equivalent.

### Database

- PostgreSQL when using a database-backed CMS.

### Media

- Optimized image delivery.
- Responsive cover-image sizes.
- Lazy loading for off-screen images.
- Consistent image aspect ratios.

### SEO

- Unique metadata for the homepage, catalogue, categories and collections.
- Canonical URLs.
- XML sitemap.
- Descriptive public URLs.
- Appropriate structured data where applicable.

### Architecture Principles

- Reusable components.
- Centralized catalogue data.
- Server-side filtering and pagination where needed.
- Strong TypeScript types.
- Accessible interaction patterns.
- Responsive design.
- Clear separation between content and presentation.

---

# 11. Functional Requirements

The implementation must satisfy the following:

1. Homepage content is configurable.
2. Homepage featured books open their corresponding previews.
3. Category cards apply the correct catalogue filter.
4. Latest releases are based on publication metadata.
5. Search works across supported book fields.
6. All enabled filters work independently and together.
7. Active filters can be removed individually.
8. Clear All resets the catalogue filters.
9. Sorting works with search and filters.
10. Pagination preserves catalogue state.
11. URL parameters restore search and filter selections.
12. Book previews display accurate catalogue data.
13. Collections open the correct group of books.
14. Administrators can manage catalogue content without editing code.
15. Unpublished books remain hidden from public views.
16. The interface adapts to desktop, tablet and mobile.
17. All essential actions work using a keyboard.
18. Loading, empty and error states are implemented.
19. The interface does not display fabricated book details.
20. No shopping cart, checkout or payment flow is implemented.

---

# 12. Visual Quality Requirements

The finished website must not look like a generic admin dashboard or ordinary online shop.

It must prioritize:

- Strong editorial art direction.
- Bold, expressive typography.
- Beautiful book-cover presentation.
- Visually varied homepage sections.
- Carefully balanced color.
- Responsive composition.
- Smooth but restrained animation.
- Consistent interaction states.
- Readable text and accessible contrast.
- Thoughtful mobile layouts.

Book-cover images supplied by the publisher must remain faithful to the original artwork.

Do not generate replacement covers for actual published books.

If sample assets are needed during development, use clearly identified placeholder content.

---

# 13. Testing and Acceptance Criteria

Before declaring the project complete, verify:

- Homepage navigation.
- Catalogue search.
- Every enabled filter.
- Combined filtering.
- Filter removal and reset.
- Sorting.
- Pagination or Load More.
- URL state persistence.
- Book preview opening and closing.
- Keyboard interaction.
- Mobile navigation.
- Image loading and fallbacks.
- Collection navigation.
- CMS content updates.
- Public visibility rules.
- Accessibility basics.
- SEO metadata.
- Production build and type checks.

Provide automated tests for critical search and filtering logic, preview interactions and content visibility.

Report any incomplete features honestly.

---

# 14. Implementation Phases

## Phase 1 — Research and Design System

- Inspect the existing repository.
- Research relevant publishing websites and open-source projects.
- Define the visual design system.
- Establish typography, color, spacing and responsive rules.
- Build reusable buttons, cards, navigation and modal components.

## Phase 2 — Homepage

- Implement the navigation.
- Build the hero.
- Add featured publications.
- Add category cards.
- Add latest releases.
- Add featured collections.
- Add publisher introduction and footer.

## Phase 3 — Catalogue

- Build the search interface.
- Implement category and collection filters.
- Add author and year filters where data exists.
- Implement sorting.
- Build the responsive book grid.
- Add pagination or Load More.
- Synchronize catalogue state with the URL.

## Phase 4 — Book Preview and Collections

- Build the quick-view modal.
- Add accessible opening and closing behaviour.
- Implement collection browsing.
- Connect cards to real catalogue records.

## Phase 5 — Content Management

- Configure book and collection management.
- Connect homepage content to the CMS.
- Add image uploads and publication controls.
- Protect administrative operations.

## Phase 6 — Testing and Launch Preparation

- Test desktop, tablet and mobile layouts.
- Verify functionality and accessibility.
- Optimize images and page performance.
- Verify SEO metadata and sitemap.
- Run tests, type checks and production builds.
- Document setup and deployment.

---

# 15. Instructions to the AI Coding Agent

Use this FD as the functional source of truth.

Before implementation:

1. Inspect the existing codebase and identify its framework and conventions.
2. Research reference publishing websites and suitable GitHub repositories.
3. Propose a visual direction with a coherent color palette and typography system.
4. Identify the required components, content models and routes.
5. Present an implementation plan before making substantial changes.

During implementation:

- Build a polished, functioning website, not a static mockup.
- Use reusable components and real data models.
- Connect every visible button and interaction to a meaningful action.
- Use realistic placeholder data only when actual publishing data is unavailable.
- Keep placeholder content easy to replace.
- Do not invent company credentials or actual publication details.
- Do not add school-specific workflows.
- Do not add shopping or checkout features.
- Preserve the original book-cover artwork.
- Follow accessibility and responsive design requirements.
- Run tests and verify functionality.

After implementation, provide:

- Completed features.
- Known limitations.
- Test results.
- Setup instructions.
- Required environment variables.
- Deployment instructions.

The initial deliverable is a fully functioning, visually polished publishing homepage and interactive book catalogue with working search, filters, book previews and collection navigation.

Do not stop at the design mockup. Implement and verify the actual interactions.
