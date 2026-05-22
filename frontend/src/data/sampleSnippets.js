export const sampleSnippets = {
  javascript: {
    language: "javascript",
    title: "JavaScript API helper",
    code: `async function fetchUsers(ids) {
  const results = [];

  for (const id of ids) {
    const response = await fetch("/api/users/" + id);
    const user = await response.json();
    console.log("loaded", user);
    results.push({
      id: user.id,
      name: user.name,
      html: user.bioHtml
    });
  }

  document.getElementById("list").innerHTML = results
    .map((entry) => "<li>" + entry.name + "</li>")
    .join("");

  return results;
}`
  },
  python: {
    language: "python",
    title: "Python order calculator",
    code: `def calculate_total(items, tax_rate):
    total = 0
    for item in items:
        if item["price"] > 0:
            total = total + item["price"] * item["quantity"]
        else:
            print("Invalid item", item)

    if tax_rate > 0:
        total = total + total * tax_rate

    return total`
  },
  java: {
    language: "java",
    title: "Java payment processor",
    code: `public class PaymentProcessor {
    public String process(String cardNumber, double amount) {
        if (amount <= 0) {
            return "invalid";
        }

        if (cardNumber == null || cardNumber.isEmpty()) {
            return "missing-card";
        }

        System.out.println("Charging " + amount);
        return "ok";
    }
}`
  },
  rust: {
    language: "rust",
    title: "Rust parser sketch",
    code: `fn parse_value(input: &str) -> Result<i32, String> {
    if input.trim().is_empty() {
        return Err("missing value".to_string());
    }

    let parsed = input.parse::<i32>();
    match parsed {
        Ok(value) => Ok(value),
        Err(_) => Err("invalid number".to_string()),
    }
}`
  },
  sql: {
    language: "sql",
    title: "SQL reporting query",
    code: `SELECT *
FROM orders
JOIN customers ON customers.id = orders.customer_id
WHERE orders.status = 'open'
ORDER BY orders.created_at DESC;`
  }
};
