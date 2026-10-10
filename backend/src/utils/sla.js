const HOURS = { URGENT: 4, HIGH: 24, MEDIUM: 72, LOW: 168 };

const calcDueAt = (priority, from = new Date()) =>
  new Date(from.getTime() + HOURS[priority] * 60 * 60 * 1000);

module.exports = { calcDueAt };