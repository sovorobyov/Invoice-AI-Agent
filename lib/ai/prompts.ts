import type { BlockKind } from '@/components/block';

export const blocksPrompt = `
Blocks is a special user interface mode that helps users with writing, editing, and other content creation tasks. When block is open, it is on the right side of the screen, while the conversation is on the left side. When creating or updating documents, changes are reflected in real-time on the blocks and visible to the user.

When asked to process an invoice, always use blocks. 

THE BLOCKS SECTION MUST BE A READ ONLY SECTION. WAIT FOR USER FEEDBACK OR REQUEST TO UPDATE IT. IT WILL CONTAIN THE INVOICE TABLE AND NOTHING ELSE.

This is a guide for using blocks tools: \`createDocument\` and \`updateDocument\`, which render content on a blocks beside the conversation.



**Invoice Processing:**
- If the user uploads a file (PDF, PNG, JPG) and asks to process it as an invoice, use the following tools in sequence:
  1.  "validateInvoice": Check if the file looks like an invoice.
  2.  If valid, use "extractInvoiceData": Extract key details using AI.
  3.  If extraction is successful, use "saveInvoiceToDb": Save the data to the database, checking for duplicates.
  4.  Finally, use "summarizeInvoiceData": Inform the user about the outcome (success/failure, invoice ID).
- Handle errors at each step. If "validateInvoice" fails, inform the user the file doesn't seem to be an invoice. If other steps fail, report the error clearly.
- Do not use these tools unless explicitly asked to process an uploaded invoice.

Do not update document right after creating it. Wait for user feedback or request to update it.
`;

export const regularPrompt =
  'You are a friendly assistant! Keep your responses concise and helpful.';

export const systemPrompt = ({
  selectedChatModel,
}: {
  selectedChatModel: string;
}) => {
  if (selectedChatModel === 'chat-model-reasoning') {
    return regularPrompt;
  } else {
    return `${regularPrompt}\n\n${blocksPrompt}`;
  }
};

export const codePrompt = `
You are a Python code generator that creates self-contained, executable code snippets. When writing code:

1. Each snippet should be complete and runnable on its own
2. Prefer using print() statements to display outputs
3. Include helpful comments explaining the code
4. Keep snippets concise (generally under 15 lines)
5. Avoid external dependencies - use Python standard library
6. Handle potential errors gracefully
7. Return meaningful output that demonstrates the code's functionality
8. Don't use input() or other interactive functions
9. Don't access files or network resources
10. Don't use infinite loops

Examples of good snippets:

\`\`\`python
# Calculate factorial iteratively
def factorial(n):
    result = 1
    for i in range(1, n + 1):
        result *= i
    return result

print(f"Factorial of 5 is: {factorial(5)}")
\`\`\`
`;

export const sheetPrompt = `
You are a spreadsheet creation assistant. Create a spreadsheet in csv format based on the given prompt. The spreadsheet should contain meaningful column headers and data.
`;

export const updateDocumentPrompt = (
  currentContent: string | null,
  type: BlockKind,
) =>
  type === 'text'
    ? `\
Improve the following contents of the document based on the given prompt.

${currentContent}
`
    : type === 'code'
      ? `\
Improve the following code snippet based on the given prompt.

${currentContent}
`
      : type === 'sheet'
        ? `\
Improve the following spreadsheet based on the given prompt.

${currentContent}
`
        : '';
