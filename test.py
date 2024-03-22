import json
import sys

def pythonTest():
    # Read JSON data from stdin
    json_data = sys.stdin.read()

    try:
        # Parse JSON data as a dictionary
        args = json.loads(json_data)
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON input: {e}")
        sys.exit(1)

    a = args.get('a', 0)
    b = args.get('b', 0)
    c = a * b
    result = {
        "a": a,
        "b": b,
        "c": c,
        "summary": f"Python test: {a} x {b} = {c}"
    }
    # Print the JSON output explicitly
    print(json.dumps(result))
    sys.stdout.flush()  # Flush stdout for immediate output

# Call the pythonTest function to execute its code
pythonTest()

