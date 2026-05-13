import con from "../config/db.config.js";

const SYSTEM_SETTINGS_CREATE_SQL = `
CREATE TABLE IF NOT EXISTS system_settings (
  id INT NOT NULL AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY setting_key (setting_key)
);
`;

const SYSTEM_SETTINGS_SEED_SQL = `
INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES
  ('system_name', 'GT Electricals'),
  ('system_logo_url', NULL);
`;

const ensureSystemSettingsTable = async () => {
  await con.query(SYSTEM_SETTINGS_CREATE_SQL);
  await con.query(SYSTEM_SETTINGS_SEED_SQL);
};

export const getSystemSettings = async (req, res) => {
  try {
    await ensureSystemSettingsTable();
    const [settings] = await con.query("SELECT * FROM system_settings");
    const settingsObj = {};
    settings.forEach((s) => {
      settingsObj[s.setting_key] = s.setting_value;
    });
    res.json({ success: true, data: settingsObj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateSystemSettings = async (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== "object") {
    return res
      .status(400)
      .json({ success: false, message: "Invalid settings format" });
  }
  try {
    await ensureSystemSettingsTable();
    for (const [key, value] of Object.entries(settings)) {
      await con.query(
        "INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?",
        [key, value, value],
      );
    }
    res.json({ success: true, message: "Settings updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
