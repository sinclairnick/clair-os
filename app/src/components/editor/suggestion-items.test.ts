import { expect, test, describe } from "vitest";
import { getMentionItems, insertIngredientMention } from "./suggestion-items";

describe("Ingredient Suggestions Logic", () => {
	const mockExisting = [
		{ id: "1", name: "Milk", quantity: 1, unit: "L" },
		{ id: "2", name: "Condensed Milk", quantity: 400, unit: "g" },
		{ id: "3", name: "Non-fat Milk", quantity: 1, unit: "L" },
	];

	test("exact match priority", () => {
		const results = getMentionItems("Milk", mockExisting);

		// Priority: [Exact Match] -> [Create New] -> [Fuzzy Matches]
		expect(results[0].name).toBe("Milk");
		expect(results[0].id).toBe("1");
		expect(results[0].isNew).toBeFalsy();

		expect(results[1].name).toBe("Milk");
		expect(results[1].isNew).toBeTruthy();

		expect(results.some(r => r.name === "Condensed Milk")).toBeTruthy();
		expect(results.some(r => r.name === "Non-fat Milk")).toBeTruthy();
	});

	test("no exact match, prioritize 'create new'", () => {
		const results = getMentionItems("Mil", mockExisting);

		// Priority: [Create New] -> [Fuzzy Matches]
		expect(results[0].name).toBe("Mil");
		expect(results[0].isNew).toBeTruthy();

		expect(results[1].name).toBe("Milk");
		expect(results[1].isNew).toBeFalsy();
	});

	test("fuzzy matching works", () => {
		const results = getMentionItems("Condensed", mockExisting);
		expect(results[0].name).toBe("Condensed"); // Create new
		expect(results[1].name).toBe("Condensed Milk");
	});
});

describe("Ingredient Parsing Logic", () => {
	// Since insertIngredientMention interacts with editor, we test the internal parsing pattern
	// In the real code it uses: item.name.match(/^(.+?)(?:\s+\(([\d.\/]+)\s*(.*?)\))?$/)

	const parse = (text: string) => {
		const match = text.match(/^(.+?)(?:\s+\(([\d.\/]+)\s*(.*?)\))?$/);
		if (match && match[2]) {
			return {
				label: match[1].trim(),
				quantity: match[2],
				unit: match[3] ? match[3].trim() : ''
			};
		}
		return { label: text, quantity: '', unit: '' };
	};

	test("parses quantity and unit in parens", () => {
		const result = parse("Salt (1 tsp)");
		expect(result.label).toBe("Salt");
		expect(result.quantity).toBe("1");
		expect(result.unit).toBe("tsp");
	});

	test("parses decimal quantity", () => {
		const result = parse("Milk (1.5 L)");
		expect(result.label).toBe("Milk");
		expect(result.quantity).toBe("1.5");
		expect(result.unit).toBe("L");
	});

	test("parses fraction quantity", () => {
		const result = parse("Flour (1/2 cup)");
		expect(result.label).toBe("Flour");
		expect(result.quantity).toBe("1/2");
		expect(result.unit).toBe("cup");
	});

	test("handles no unit", () => {
		const result = parse("Egg (2)");
		expect(result.label).toBe("Egg");
		expect(result.quantity).toBe("2");
		expect(result.unit).toBe("");
	});

	test("handles no parens", () => {
		const result = parse("Butter");
		expect(result.label).toBe("Butter");
		expect(result.quantity).toBe("");
		expect(result.unit).toBe("");
	});
});
