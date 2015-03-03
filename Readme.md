# JSDN: JavaScript Diagram Notation

JSDN is a formalized way of visually simulating execution of the JavaScript language. It is both a diagram notation and set of simplified execution rules.

## Goals

JSDN is intended to be a tool for teaching not just the JavaScript language, but general Computer Science concepts as well (heap, stack, closures, garbage collection, etc.).

100% accuracy on internals representation is **not** a goal of JSDN. Consistency and concepts are favored over intricate details such as language performance optimizations. For example, every time a variable is assigned to a new string, in JSDN we say the string is *created*, even though the string may already exist depending on the JS runtime / interpretor.

## Material

1. [Variables and Function Calls](learn/jsdn-by-example-1.pdf?raw=true)
2. [More Function Calls](learn/jsdn-by-example-2.pdf?raw=true)
3. [Functions as Arguments](learn/jsdn-by-example-3.pdf?raw=true)
4. [Objects in Memory](learn/jsdn-by-example-4.pdf?raw=true)
