// Minimal mock for setCounter used in add-count.tsx
export async function setCounter(input: { value: number }) {
	return { success: true, value: input.value };
}
