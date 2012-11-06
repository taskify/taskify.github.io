todo
====

a lightweight clientside todo list app using localStorage - HTML5 + JS - demo at http://webr3.org/apps/play/todo/

- double enter when editing to create a new item
- star for urgent, exclamation for important, auto score and color coding based on priority
- tick to mark an item as complete, and x to remove the an item
- drag and drop to reorder items
- multiple columns with editable labels
- create new tags at the top left, add them to items with the tag button drop down, remove a tag from an item by clicking it.
- focus button to give focus to the item you're currently doing.
- don't worry about saving, it's all done automatically every time a state changes

To clear and start again, just do localStorage.removeItem('todo') in the console of your browser.