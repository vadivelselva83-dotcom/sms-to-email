import React, { useEffect, useState } from "react";
import { SafeAreaView, View, Text, TextInput, Button, Switch, Alert, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBaseUrl, setBaseUrl, getConfig, updateConfig } from "./api";
import type { Config } from "./types";

export default function App() {
  const [baseUrl, _setBaseUrl] = useState<string>("");
  const [enabled, setEnabled] = useState(true);
  const [allowedSenderE164, setAllowedSenderE164] = useState("");
  const [destinationEmail, setDestinationEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const savedBase = await getBaseUrl();
      if (savedBase) {
        _setBaseUrl(savedBase);
        const cfg = await getConfig();
        setEnabled(!!cfg.enabled);
        setAllowedSenderE164(cfg.allowedSenderE164 || "");
        setDestinationEmail(cfg.destinationEmail || "");
      }
    } catch (e: any) {
      console.log("load error", e?.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveBaseUrl() {
    try {
      if (!baseUrl) return Alert.alert("Base URL is required", "Example: https://abc123.ngrok.io or smal.live");
      await setBaseUrl(baseUrl);
      Alert.alert("Saved", "Backend URL saved locally.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || String(e));
    }
  }

  async function fetchConfig() {
    try {
      const cfg = await getConfig();
      setEnabled(!!cfg.enabled);
      setAllowedSenderE164(cfg.allowedSenderE164 || "");
      setDestinationEmail(cfg.destinationEmail || "");
      Alert.alert("Loaded", "Config pulled from server.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || String(e));
    }
  }

  async function saveConfig() {
    try {
      if (!destinationEmail) return Alert.alert("Destination email required");
      const cfg: Config = {
        enabled,
        allowedSenderE164: allowedSenderE164.trim(),
        destinationEmail: destinationEmail.trim()
      };
      const resp = await updateConfig(cfg);
      if (resp?.error) return Alert.alert("Server error", resp.error);
      Alert.alert("Saved", "Config updated on server.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || String(e));
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>SMS → Email Forwarding (Server-Based)</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Backend Base URL</Text>
        <TextInput
          style={styles.input}
          placeholder="https://your-ngrok-id.ngrok.io"
          value={baseUrl}
          onChangeText={_setBaseUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.row}>
          <Button title="Save URL" onPress={saveBaseUrl} />
          <View style={{ width: 12 }} />
          <Button title="Pull Config" onPress={fetchConfig} />
        </View>
      </View>

      <View style={styles.card}>
        <View style={[styles.row, { justifyContent: "space-between", alignItems: "center" }]}>
          <Text style={styles.label}>Forwarding Enabled</Text>
          <Switch value={enabled} onValueChange={setEnabled} />
        </View>

        <Text style={styles.help}>
          Allowed Sender (E.164). Example: +14165551234. Only messages from this number will be forwarded.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="+14165551234"
          value={allowedSenderE164}
          onChangeText={setAllowedSenderE164}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Destination Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          value={destinationEmail}
          onChangeText={setDestinationEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />

        <Button title={loading ? "Saving..." : "Save Config"} onPress={saveConfig} />
      </View>

      <Text style={styles.footer}>
        Note: iOS does not allow third-party apps to read SMS. This app configures a server that forwards SMS received by
        your Twilio number.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  card: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#ddd", gap: 10 },
  label: { fontSize: 16, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, fontSize: 16 },
  row: { flexDirection: "row" },
  help: { color: "#666", marginBottom: 6 },
  footer: { color: "#666" }
});
