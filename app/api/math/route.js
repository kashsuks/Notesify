export const solveMathEquation = async (problem) => {
    const url = 'https://math-solver1.p.rapidapi.com/algebra/';
    const options = {
        method: 'POST',
        headers: {
            'x-rapidapi-key': 'e066ff7741msh61c3a8a3abe04c6p192d91jsn011505558bfa',
            'x-rapidapi-host': 'math-solver1.p.rapidapi.com',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            problem,
        }),
    };

    try {
        const response = await fetch(url, options);
        const result = await response.text();
        return result; // Assuming the result is returned as plain text
    } catch (error) {
        console.error('Error solving math equation:', error);
        throw error;
    }
};
