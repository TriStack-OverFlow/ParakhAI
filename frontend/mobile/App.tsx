import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';

const Stack = createNativeStackNavigator();

function HomeScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Parakh.AI</Text>
      <Text style={styles.subtitle}>The Next Evolution in Edge Intelligence</Text>
      <TouchableOpacity style={styles.buttonMain} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.buttonTextLight}>Access Node (Login)</Text>
      </TouchableOpacity>
      <StatusBar style="light" />
    </View>
  );
}

function LoginScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const simulateLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigation.replace('Dashboard');
    }, 1500);
  };
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Access Node</Text>
        <Text style={styles.subtitle}>Secure connection to manufacturing intelligence.</Text>
        <View style={styles.inputGroup}>
           <Text style={styles.label}>Employee Endpoint</Text>
           <TextInput style={styles.input} placeholder="systems@parakh.ai" placeholderTextColor="#52525b" autoCapitalize="none" />
        </View>
        <TouchableOpacity style={styles.buttonMain} disabled={loading} onPress={simulateLogin}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonTextLight}>Initiate Handshake</Text>}
        </TouchableOpacity>
      </View>
      <StatusBar style="light" />
    </View>
  );
}

function DocsScreen() {
  const [data, setData] = useState<number[]>([10, 20, 30, 40, 50, 60, 40, 30, 20, 30]);
  useEffect(() => {
    const i = setInterval(() => {
      setData(prev => {
        const next = [...prev, Math.floor(Math.random()*100)];
        if(next.length > 20) next.shift();
        return next;
      });
    }, 1000);
    return () => clearInterval(i);
  }, []);
  
  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.titleSmall}>Documentation & Analytics</Text>
      <Text style={styles.subtitle}>Real-time cluster telemetry and SDK docs.</Text>
      <View style={styles.card}>
        <Text style={styles.statLabel}>LIVE DATA STREAM</Text>
        <View style={styles.chartArea}>
           {data.map((h, idx) => (
              <View key={idx} style={[styles.bar, { height: h }]} />
           ))}
        </View>
      </View>
      <View style={{height:20}} />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Integration SDK</Text>
        <Text style={styles.subtitle}>Download C++ / Python edge agents.</Text>
      </View>
      <View style={{height:20}} />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>REST API</Text>
        <Text style={styles.subtitle}>Endpoints for diagnostic streams.</Text>
      </View>
    </ScrollView>
  );
}

function PricingScreen() {
  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.titleSmall}>Plans & Pricing</Text>
      <Text style={styles.subtitle}>Scale your inference capabilities.</Text>
      <View style={styles.card}>
        <Text style={styles.statLabel}>EDGE BASIC</Text>
        <Text style={styles.title}>/mo</Text>
        <Text style={styles.subtitle}>100k inferences / month</Text>
        <TouchableOpacity style={styles.buttonMain}><Text style={styles.buttonTextLight}>Select Plan</Text></TouchableOpacity>
      </View>
      <View style={{height:20}} />
      <View style={styles.card}>
        <Text style={styles.statLabel}>ENTERPRISE CLUSTER</Text>
        <Text style={styles.title}>/mo</Text>
        <Text style={styles.subtitle}>Unlimited inferences + Dedicated Node</Text>
        <TouchableOpacity style={styles.buttonMain}><Text style={styles.buttonTextLight}>Contact Sales</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function DashboardScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
         <Text style={styles.titleSmall}>Parakh.AI Edge</Text>
         <TouchableOpacity onPress={() => navigation.replace('Home')} style={styles.buttonOutline}>
            <Text style={styles.buttonTextDark}>Logout</Text>
         </TouchableOpacity>
      </View>
      <View style={styles.grid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>SYSTEM SECURE</Text>
          <Text style={styles.statValue}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>LATENCY LINK</Text>
          <Text style={styles.statValue}>12ms</Text>
        </View>
      </View>
      <Text style={styles.heading}>Your diagnostic streams are standing by.</Text>
      <View style={{height: 40}} />
      <View style={{width: '100%', gap: 10}}>
         <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Docs')}>
            <Text style={styles.navButtonText}>Live Analytics & Docs</Text>
         </TouchableOpacity>
         <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Pricing')}>
            <Text style={styles.navButtonText}>Manage Pricing</Text>
         </TouchableOpacity>
      </View>
      <StatusBar style="light" />
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#0a0a0a' }, headerTintColor: '#fff', contentStyle: { backgroundColor: '#0a0a0a' } }}>
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Secure Login' }} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Docs" component={DocsScreen} options={{ title: 'Analytics' }} />
        <Stack.Screen name="Pricing" component={PricingScreen} options={{ title: 'Pricing' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', padding: 20 },
  scrollContainer: { flex: 1, backgroundColor: '#0a0a0a' },
  scrollContent: { padding: 20 },
  card: { width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 30, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 },
  title: { color: '#fff', fontSize: 48, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  titleSmall: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  cardTitle: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#a1a1aa', fontSize: 14, textAlign: 'center', marginBottom: 30 },
  inputGroup: { width: '100%', marginBottom: 20 },
  label: { color: '#a1a1aa', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1.5 },
  input: { backgroundColor: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, padding: 16, borderRadius: 12, color: '#fff' },
  buttonMain: { backgroundColor: '#06b6d4', paddingVertical: 18, paddingHorizontal: 30, borderRadius: 12, alignItems: 'center', width: '100%' },
  buttonOutline: { borderColor: 'rgba(239,68,68,0.5)', borderWidth: 1, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  buttonTextLight: { color: '#000', fontWeight: 'bold', fontSize: 16, letterSpacing: 1, textTransform: 'uppercase' },
  buttonTextDark: { color: '#fca5a5', fontWeight: 'bold', fontSize: 12 },
  header: { position: 'absolute', top: 50, width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  grid: { flexDirection: 'row', gap: 15, width: '100%', marginBottom: 30 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 20, alignItems: 'center' },
  statLabel: { color: '#06b6d4', fontSize: 10, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 8 },
  statValue: { color: '#fff', fontSize: 18, fontWeight: '600' },
  heading: { color: '#e4e4e7', fontSize: 20, textAlign: 'center', lineHeight: 30 },
  navButton: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 16, borderRadius: 12, width: '100%' },
  navButtonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  chartArea: { height: 100, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 10 },
  bar: { width: 10, backgroundColor: '#06b6d4', borderRadius: 2 }
});
