#!/bin/bash
# Claude Documentation Generator
# Usage: ./scripts/claude-docs.sh <source_file> [output_file]

# Load environment variables
if [ -f ".env" ]; then
    source .env
else
    echo "Warning: .env file not found. Please ensure ANTHROPIC_API_KEY is set in environment."
fi

# Check if API key is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "Error: ANTHROPIC_API_KEY not set in environment"
    echo "Please add your Anthropic API key to .env file:"
    echo "ANTHROPIC_API_KEY=sk-ant-api03-your-key-here"
    exit 1
fi

# Check if Claude CLI is installed
if ! command -v claude &> /dev/null; then
    echo "Error: Claude CLI not found"
    echo "Install it with: npm install -g @anthropic-ai/claude-code"
    exit 1
fi

# Check arguments
if [ -z "$1" ]; then
    echo "Usage: $0 <source_file> [output_file]"
    echo ""
    echo "Examples:"
    echo "  $0 src/main.ts"
    echo "  $0 src/core/AIDevTools.ts docs/ai-dev-tools.md"
    echo "  $0 package.json README-dependencies.md"
    exit 1
fi

input_file=$1
output_file=${2:-"${input_file%.*}-docs.md"}

# Check if input file exists
if [ ! -f "$input_file" ]; then
    echo "Error: Input file '$input_file' does not exist"
    exit 1
fi

echo "📄 Generating documentation for: $input_file"
echo "📝 Output file: $output_file"
echo "🤖 Using Claude AI..."
echo ""

# Create output directory if it doesn't exist
output_dir=$(dirname "$output_file")
if [ ! -d "$output_dir" ]; then
    mkdir -p "$output_dir"
    echo "📁 Created output directory: $output_dir"
fi

# Generate documentation using Claude
claude -p --output-format text --model sonnet \
    "Generate comprehensive documentation for this code file. Include:
    
    1. **Purpose & Overview**: What this file/module does
    2. **Key Features**: Main functionality and capabilities
    3. **API Reference**: Functions, classes, interfaces, and their parameters
    4. **Usage Examples**: Practical code examples showing how to use it
    5. **Dependencies**: Required imports and external dependencies
    6. **Implementation Notes**: Important technical details
    7. **Configuration**: Any configuration options or environment variables
    8. **Error Handling**: How errors are handled and what to expect
    9. **Performance Considerations**: Any performance implications
    10. **Best Practices**: Recommended usage patterns
    
    Format the output as clean, well-structured Markdown suitable for documentation.
    Use proper code blocks with syntax highlighting.
    Include a table of contents for longer documents." \
    < "$input_file" > "$output_file"

# Check if documentation was generated successfully
if [ $? -eq 0 ] && [ -s "$output_file" ]; then
    echo "✅ Documentation generated successfully!"
    echo "📊 File size: $(wc -l < "$output_file") lines"
    echo "📍 Location: $output_file"
    
    # Show first few lines as preview
    echo ""
    echo "📖 Preview:"
    echo "----------------------------------------"
    head -10 "$output_file"
    echo "----------------------------------------"
    echo "(showing first 10 lines)"
else
    echo "❌ Error: Failed to generate documentation"
    exit 1
fi