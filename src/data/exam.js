// Exam catalog: swap this file for a JSON/API loader later (see roadmap).
export const SEED = `
PRAGMA foreign_keys=ON;
CREATE TABLE categories(id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE clients(id INTEGER PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL, city TEXT);
CREATE TABLE products(id INTEGER PRIMARY KEY, name TEXT NOT NULL, category_id INTEGER REFERENCES categories(id), price REAL NOT NULL);
CREATE TABLE orders(id INTEGER PRIMARY KEY, client_id INTEGER REFERENCES clients(id), order_date TEXT, status TEXT);
CREATE TABLE order_items(id INTEGER PRIMARY KEY, order_id INTEGER REFERENCES orders(id), product_id INTEGER REFERENCES products(id), qty INTEGER NOT NULL);
INSERT INTO categories VALUES(1,'Computers'),(2,'Books'),(3,'Audio'),(4,'Toys');
INSERT INTO clients VALUES(1,'Anna','Kowalska','Warszawa'),(2,'Piotr','Nowak','Kraków'),(3,'Maria','Wiśniewska','Warszawa'),(4,'Jan','Zieliński','Gdańsk'),(5,'Ewa','Lewandowska','Kraków'),(6,'Tomasz','Kamiński','Warszawa');
INSERT INTO products VALUES(1,'Laptop',1,2400),(2,'Mouse',1,80),(3,'Keyboard',1,150),(4,'Novel',2,45),(5,'Atlas',2,120),(6,'Headphones',3,300);
INSERT INTO orders VALUES(1,1,'2025-01-10','paid'),(2,2,'2025-01-15','paid'),(3,2,'2025-02-02','paid'),(4,3,'2025-02-11','paid'),(5,4,'2025-02-20','paid'),(6,1,'2025-03-05','paid'),(7,5,'2025-03-12','paid'),(8,3,'2025-03-18','paid');
INSERT INTO order_items VALUES(1,1,1,1),(2,2,2,2),(3,2,3,1),(4,3,6,1),(5,4,4,3),(6,5,5,2),(7,5,4,1),(8,6,2,1),(9,7,6,1),(10,8,3,2);`;

// solution = hidden reference | ordered = row order matters | aliases = column names are graded
// need = concepts we look for in the student's SQL to produce targeted hints
export const TASKS = [
  { id: 't1', ordered: true, aliases: false,
    text: 'Select the first and last names of clients living in <b>Warszawa</b>, sorted by last name ascending.',
    solution: "SELECT first_name, last_name FROM clients WHERE city='Warszawa' ORDER BY last_name ASC",
    need: [{ re: /\bwhere\b/i, msg: 'Filter by city with <b>WHERE</b>.' }, { re: /\border\s+by\b/i, msg: 'The task asks for sorting: <b>ORDER BY</b>.' }] },
  { id: 't2', ordered: false, aliases: false,
    text: 'Select first and last names of clients whose <b>total value of all orders exceeds 500 PLN</b> (value = qty × price).',
    solution: 'SELECT c.first_name, c.last_name FROM clients c JOIN orders o ON o.client_id=c.id JOIN order_items i ON i.order_id=o.id JOIN products p ON p.id=i.product_id GROUP BY c.id HAVING SUM(i.qty*p.price)>500',
    need: [{ re: /\bjoin\b|,/i, msg: 'Data is spread over several tables: connect them with <b>JOIN … ON</b>.' }, { re: /\bgroup\s+by\b/i, msg: 'You need totals <i>per client</i>: <b>GROUP BY</b>.' }, { re: /\bhaving\b/i, msg: 'A condition on SUM() belongs in <b>HAVING</b>, not WHERE.' }, { re: /\bsum\s*\(/i, msg: 'Add up line values with <b>SUM()</b>.' }] },
  { id: 't3', ordered: true, aliases: true,
    text: 'Select each <b>category name</b> and the <b>number of products</b> in it (alias <code>product_count</code>), including empty categories. Sort by <code>product_count</code> descending, then by name.',
    solution: 'SELECT c.name, COUNT(p.id) AS product_count FROM categories c LEFT JOIN products p ON p.category_id=c.id GROUP BY c.id ORDER BY product_count DESC, c.name',
    need: [{ re: /\bleft\s+(outer\s+)?join\b/i, msg: 'Empty categories vanish with a plain JOIN. Consider <b>LEFT JOIN</b>.' }, { re: /\bcount\s*\(/i, msg: 'Use <b>COUNT()</b>.' }, { re: /\bgroup\s+by\b/i, msg: 'Count per category: <b>GROUP BY</b>.' }] },
];