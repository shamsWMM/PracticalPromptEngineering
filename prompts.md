Prompt 1: Standard
```text
Create a prompt library application that lets users save and delete prompts.

Users should be able to:

Enter a title and content for their prompt
Save it to localStorage
See all their saved prompts displayed on the page
Delete prompts they no longer need
Make it look clean and professional with HTML, CSS, and JavaScript.
```

Prompt 2: Zero Shot
```text
Create a prompt library application in HTML, CSS, and JavaScript.

Create an HTML page with a form containing fields for the prompt title and content

Add a save prompt button that saves to localStorage

Display saved prompts in cards

Each prompt card should show the title, a content preview of a few words, and a delete button

Deleting should remove the prompt from localStorage and update the display

Style it with CSS to look clean and modern with a developer theme

Include all HTML structure, CSS styling, and JavaScript functionality in their own files, but that can be run immediately and includes no other features.
```

Prompt 3: One Shot
```text
You are helping develop a prompt library application. Here's an example of how to analyze and implement a new feature:

**EXAMPLE:** Feature Request: "Add a favorites/bookmarking system"

Implementation Plan:

1. **User Story**: As a user, I want to mark prompts as favorites so I can quickly access my most-used prompts without scrolling through the entire library.
2. **Technical Requirements**:
    - Add a heart/bookmark icon to each prompt card
    - Store favorite status in localStorage or database
    - Create a filter to show only favorited prompts
    - Visual indicator when a prompt is favorited (filled vs outlined icon)
3. **Code Structure**:

javascript
// Data model update
prompt = {
  id: 'prompt-123',
  title: 'Marketing Email Generator',
  content: '...',
  isFavorite: false,  // New field
  createdAt: '2024-01-15',
  rating: 4.5
}

// Toggle favorite function
function toggleFavorite(promptId) {
  const prompt = prompts.find(p => p.id === promptId);
  prompt.isFavorite = !prompt.isFavorite;
  saveToStorage(prompts);
  updateUI();
}

4. **UI/UX Considerations**:
    - Place favorite icon in consistent location (top-right of card)
    - Use intuitive icons (heart or star)
    - Provide visual feedback on click (animation/color change)
    - Add "Favorites" filter tab in navigation

---

**YOUR TASK:** Analyze the following feature request using the EXACT same format as the example above (User Story, Technical Requirements with bullet points, Code Structure with JavaScript examples, and UI/UX Considerations).

Feature Request: "Add a 5-star rating component to rate prompt effectiveness"
```

Prompt 4:
```text
I need you to create a prompt for implementing a new feature. Here are examples of effective feature implementation prompts:

**EXAMPLE 1: Save/Delete Functionality Prompt**
Create a save and delete system for a prompt library application with the following requirements:

Technical Specifications:
- Save button that persists prompts to localStorage
- Delete button with confirmation dialog before removal
- Visual feedback on successful save (green checkmark animation)
- Trash icon with hover effect for delete action
- Auto-save indicator when changes are detected

Provide complete HTML, CSS, and JavaScript with:
1. Semantic HTML with data attributes for prompt IDs
2. CSS animations for save confirmation and delete hover states
3. JavaScript with proper event delegation for dynamically added prompts
4. localStorage integration with JSON serialization

The system should work with this data structure:
const prompts = [
  { id: 'prompt-001', title: "Blog Writer", content: "Generate blog posts...", savedAt: Date.now() }
];

Include error handling for localStorage quota exceeded and implement a "Recently Deleted" temporary storage (up to 5 items).

**EXAMPLE 2: Star Rating Component Prompt**
Build a 5-star rating system for rating prompt effectiveness with these specifications:

Core Requirements:
- Interactive 5-star display (click to rate, hover to preview)
- Half-star precision (4.5 stars possible)
- Shows average rating and total number of ratings
- Updates immediately without page refresh
- Allows users to change their rating

Implementation Details:
- SVG stars for crisp display at any size
- Gold fill for rated, gray outline for unrated
- Smooth hover animations (scale and glow effect)
- Display format: "4.5 ★ (23 ratings)"

Deliver production-ready code including:
1. HTML with accessible ARIA labels for screen readers
2. CSS with star animations and responsive sizing
3. JavaScript for rating logic and state management
4. Comments explaining calculation methods

Data model to support:
{
  promptId: 'prompt-001',
  ratings: [5, 4, 5, 3, 5], // Array of all ratings
  userRating: 4, // Current user's rating
  averageRating: 4.4
}

**YOUR TASK:** Based on the examples above, create a detailed prompt for building a "notes section" feature where users can add, edit, save, and delete notes for each prompt in the library.

The prompt should follow the pattern shown in the examples:

- Clear feature description
- Specific technical requirements
- Implementation details
- Expected deliverables
- Data structure/integration notes

Keep it as simple as possible to create a working notes section with only the features mentioned in your task.
```


Prompt 5: Structured Output
```text
Create a metadata tracking system for a prompt journal web application that is attached to our prompts in our prompt library.

FUNCTION SPECIFICATIONS:
1. trackModel(modelName: string, content: string): MetadataObject
   - Accept any non-empty string for modelName
   - Auto-generate createdAt timestamp
   - Estimate tokens from content
   
2. updateTimestamps(metadata: MetadataObject): MetadataObject
   - Update the updatedAt field
   - Validate updatedAt >= createdAt
   
3. estimateTokens(text: string, isCode: boolean): TokenEstimate
   - Base calculation: min = 0.75 * word_count, max = 0.25 * character_count  
   - If isCode=true, multiply both by 1.3
   - Confidence: 'high' if <1000 tokens, 'medium' if 1000-5000, 'low' if >5000

VALIDATION RULES:
- All dates must be valid ISO 8601 strings (YYYY-MM-DDTHH:mm:ss.sssZ)
- Model name must be non-empty string, max 100 characters
- Throw errors for invalid inputs with descriptive messages

OUTPUT SCHEMA:
{
  model: string,
  createdAt: string (ISO 8601),
  updatedAt: string (ISO 8601),
  tokenEstimate: {
    min: number,
    max: number,
    confidence: 'high' | 'medium' | 'low'
  }
}

VISUAL DISPLAY:
Create an HTML/CSS component that adds and displays metadata in the prompt card:
- Model name
- Timestamps in human-readable format
- Token estimate with color-coded confidence (green/yellow/red)
- Sort by createdAt descending

CONSTRAINTS:
- Pure JavaScript only (no external libraries)
- Must work in browser environment
- Include try/catch error handling
```

Prompt 5: Chain of Thought
```text
Let's build a complete export/import system step by step.

Step 1: First, analyze what data we need to export:
- All prompts with their metadata

Step 2: Design the export JSON schema that includes:
- Version number for future compatibility
- Export timestamp
- Statistics (total prompts, average rating, most used model)
- Complete prompts array

Step 3: Create the export function that:
- Gathers all data from localStorage
- Validates data integrity
- Creates a blob and triggers download with timestamp

Step 4: Create the import function that:
- Reads the uploaded file
- Validates the JSON structure and version
- Checks for duplicate IDs
- Merges or replaces existing data based on user choice

Step 5: Add error recovery:
- Backup existing data before import
- Rollback on failure
- Provide detailed error messages

Add the import and export buttons and merge conflict resolution prompts

Implement this complete system with all steps. Think step by step.
```

Prompt 6: Using Delimiters
```text
I need to research how existing tools handle prompt management and version control to inform architecture decisions for a prompt library I'm building and hoping to move to production. Please research and analyze different approaches using this structure:

<research_area>
<topic>Prompt Management Solutions</topic>
<questions>
- What tools currently exist for prompt library management?
</questions>
</research_area>

<research_area>
<topic>Collaboration Features</topic>
<questions>
- How do teams share Postman collections or Insomnia workspaces?
- What permission models exist in developer tools?
</questions>
</research_area>

<research_area>
<topic>Technical Implementation Details</topic>
<questions>
- What databases do similar tools use (research from their engineering blogs)?
- How do they handle search at scale?
- What's their approach to data export/import?
- How do they prevent abuse and implement rate limiting?
</questions>
</research_area>

For each research area:
1. Find concrete examples from real products
2. Identify patterns across successful tools
3. Highlight common failures or user complaints
4. Estimate implementation complexity

Then synthesize this into:
- A competitive analysis matrix
- Recommended features for our MVP vs future releases
- Technical decisions informed by market research
```

Prompt 7: Persona
```text
You are a Senior Engineer with experience building startups from zero to MVP.

Our prompt library currently runs entirely in the browser with localStorage. We're considering making it a production-ready tool that teams can use. Create a comprehensive technical specification that includes:

1. **System Architecture Document** that covers:
   - Data persistence strategy (evaluate PostgreSQL vs DynamoDB vs Firebase)
   - Authentication approach (OAuth, magic links, or API keys)
   - Real-time collaboration requirements
   - Rate limiting and abuse prevention
   - Search infrastructure (full-text search vs vector embeddings)

2. **API Design Specification** with:
   - RESTful endpoints vs GraphQL evaluation
   - Versioning strategy
   - Pagination approach for large prompt libraries
   - Webhook events for integrations

3. **Scaling Projections**:
   - Start with 100 users → path to 1M users
   - Cost per user at different tiers
   - Performance benchmarks to maintain

Use your experience to make opinionated recommendations. Write as if you're presenting to a junior engineering team.
```