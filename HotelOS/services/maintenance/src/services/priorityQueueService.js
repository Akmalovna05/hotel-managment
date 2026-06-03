function comparePriority(a, b) {
  if (a.guest_impact !== b.guest_impact) return b.guest_impact - a.guest_impact;
  if (a.severity !== b.severity) return b.severity - a.severity;
  return new Date(a.sla_deadline) - new Date(b.sla_deadline);
}

async function getOrderedTickets(client) {
  const { rows } = await client.query(
    `SELECT * FROM maintenance_tickets WHERE status = 'open' ORDER BY guest_impact DESC, severity DESC, sla_deadline ASC`
  );
  return rows.sort(comparePriority);
}

module.exports = { comparePriority, getOrderedTickets };
