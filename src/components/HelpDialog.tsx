import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle } from 'lucide-react';

const HelpDialog: React.FC = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="ml-2 text-gray-600 hover:text-gray-800 hover:bg-gray-300">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Minimark Help</DialogTitle>
          <DialogDescription>
            Welcome to Minimark! Here's a guide to its features:
          </DialogDescription>
        </DialogHeader>
        <div className="prose prose-sm dark:prose-invert max-w-none py-4 space-y-4">
          
          <section>
            <h4><span role="img" aria-label="bookmark">🔖</span> Bookmarks & Basic Operations</h4>
            <ul>
              <li><strong>Adding Bookmarks:</strong> Simply copy a URL (e.g., from your browser's address bar) and paste it anywhere on the Minimark page (<code>Ctrl+V</code> or <code>Cmd+V</code>). The bookmark will be added to your current view.</li>
              <li><strong>Editing Titles:</strong> Right-click on any bookmark or group and select "Edit Title". Click outside or press <code>Enter</code> to save, or <code>Escape</code> to cancel.</li>
              <li><strong>Removing Items:</strong> Right-click on an item and select "Remove Link" or "Remove Group". If you remove a group, its contents will be moved up to the parent level unless you choose to delete contents.</li>
              <li><strong>Viewing Details:</strong> Right-click on any item and select "View Details" to see all its metadata, such as click count, dates, and link status.</li>
            </ul>
          </section>

          <section>
            <h4><span role="img" aria-label="folder">📁</span> Groups</h4>
            <ul>
              <li><strong>Creating from Link:</strong> Right-click a link and choose "Create Group from this Link". A new group will be made in the current view, and the link will be moved into it.</li>
              <li><strong>Auto-Grouping:</strong> When you add a second link from the same domain (e.g., another page from <code>example.com</code>) into the same view (top-level or inside a specific group), Minimark will automatically create a group named after the domain (e.g., "example.com") and move both links into it. If a group for that domain already exists in that view, the link will be moved into the existing group. You'll be navigated into the group automatically.</li>
              <li><strong>Navigation:</strong> Click on a group to enter it. Use the breadcrumbs at the top (e.g., "Top / Group A / Group B") to navigate back to parent groups or the top level.</li>
            </ul>
          </section>

          <section>
            <h4><span role="img" aria-label="link">🔗</span> Dynamic Links</h4>
            <p>For links with URL parameters (e.g., <code>https://example.com/search?query=test&lang=en</code>):</p>
            <ol>
              <li>Right-click the link and find the "Dynamic Parameters" sub-menu.</li>
              <li>For each parameter (e.g., 'query', 'lang'), you can toggle it to be "dynamic" or "static".</li>
              <li>If a parameter is dynamic, a small input field will appear next to the bookmark's title (e.g., <code>query=</code>).</li>
              <li>Type your desired value into this input. When you click the link, it will open with the URL constructed using your input.</li>
            </ol>
            <p>This is useful for search pages, pre-filled forms, etc.</p>
          </section>

          <section>
            <h4><span role="img" aria-label="magnifying glass">🔍</span> Searching & Filtering</h4>
            <ul>
              <li><strong>Search Bar:</strong> Use the search bar at the top of the current view to filter items by title or URL (for links). The search is case-insensitive and applies only to the items in your current group or the top level if you're there.</li>
              <li><strong>Replace Mode:</strong> Click the replace icon (two arrows) next to the search bar. Enter a search term, then a replacement term. "Replace in View" will update titles of matching items in the current view.</li>
            </ul>
          </section>

          <section>
            <h4><span role="img" aria-label="tools">🛠️</span> Advanced Item Management (Settings Menu & Multi-Select)</h4>
            <p>Access the settings menu via the gear icon (<span role="img" aria-label="gear">⚙️</span>) in the top-right corner.</p>
            <ul>
              <li><strong>Sorting:</strong> Choose how items in the current view are ordered (e.g., by date added, clicks, title).</li>
              <li><strong>Item Layout:</strong> Adjust how bookmarks are displayed:
                <ul>
                  <li><em>Dynamic Width:</em> Items flow like text, with adjustable title truncation.</li>
                  <li><em>Fixed Widths (S, M, L, XL):</em> Items are displayed in a grid-like fashion with set widths.</li>
                </ul>
              </li>
              <li><strong>Multi-Select Mode:</strong>
                <ul>
                  <li>Click the checkbox icon (<span role="img" aria-label="checkbox">☑️</span>) next to the search bar to enter select mode.</li>
                  <li>Click links to select/deselect them.</li>
                  <li>Use the "Actions" button to:
                    <ul>
                      <li>Select/Deselect all visible links.</li>
                      <li>Move selected links to a new or existing group.</li>
                      <li>Delete selected links.</li>
                    </ul>
                  </li>
                  <li>Use the "Tags" icon (<span role="img" aria-label="tags">🏷️</span>) to open a dialog showing frequent words in visible titles. Selecting words here will add matching links to your current selection.</li>
                </ul>
              </li>
            </ul>
          </section>
          
          <section>
            <h4><span role="img" aria-label="globe with meridians">🌐</span> Link Status Checking</h4>
            <ul>
              <li>Minimark automatically checks the status of your links (online/offline) in the background.</li>
              <li><strong>Indicators:</strong>
                <ul>
                  <li><span className="text-green-500">✓</span> Online links may show a green check.</li>
                  <li><span className="text-orange-500">⚠</span> Offline links may show an orange warning icon.</li>
                  <li><span className="text-red-500 line-through">Dead Link</span> Links offline for over a week will be struck through.</li>
                  <li>A spinner (<span className="italic">/ Checking...</span>) appears during checks.</li>
                </ul>
              </li>
              <li><strong>Re-check:</strong> Right-click an offline or dead link and select "Re-check Link Status" to verify it again.</li>
              <li>The system avoids checks if you are offline to prevent false negatives.</li>
            </ul>
          </section>

          <section>
            <h4><span role="img" aria-label="archive box">📦</span> Archiving</h4>
            <ul>
              <li><strong>Manual Archive:</strong> (Currently, items are unarchived on click if they were previously archived. Direct archive action might be added later).</li>
              <li><strong>Auto-Archive:</strong> Enable this in the settings menu (<span role="img" aria-label="gear">⚙️</span>). Links not clicked for a configurable period (e.g., 6 months) will be automatically archived.</li>
              <li><strong>View Archive:</strong> Click the "View Archive" button at the bottom of the page to see all archived links. From here, clicking an archived link will unarchive it and open it.</li>
            </ul>
          </section>

          <section>
            <h4><span role="img" aria-label="floppy disk">💾</span> Import & Export</h4>
            <p>Use the settings menu (<span role="img" aria-label="gear">⚙️</span>) to:</p>
            <ul>
              <li><strong>Export All Items:</strong> Downloads a JSON file of all your bookmarks and groups, including their structure, dynamic link settings, and status information.</li>
              <li><strong>Import Items:</strong> Upload a previously exported JSON file or a standard browser bookmarks HTML file to restore/add your bookmarks. Duplicates (based on ID or URL for links) will generally be skipped.</li>
            </ul>
          </section>

        </div>
        <DialogFooter className="sm:justify-start pt-4">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HelpDialog;