import con from "../config/db.config.js";

export const getSystemSettings = async (req, res) => {
  try {
    const [settings] = await con.query("SELECT * FROM system_settings");
    const settingsObj = {};
    settings.forEach((s) => { settingsObj[s.setting_key] = s.setting_value; });
    res.json({ success: true, data: settingsObj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateSystemSettings = async (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== "object") {
    return res.status(400).json({ success: false, message: "Invalid settings format" });
  }
  try {
    for (const [key, value] of Object.entries(settings)) {
      await con.query(
        "INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?",
        [key, value, value]
      );
    }
    res.json({ success: true, message: "Settings updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
