import type { CraftResult, ReaClassInfo, ReaManifest, ReaMethodDetail, ReaReferenceEdge } from './types';

export const MOCK_MANIFEST: ReaManifest = {
  appLabel: 'QuickNotes',
  packageName: 'com.example.quicknotes',
  versionName: '2.3.1',
  minSdk: 24,
  targetSdk: 34,
  permissions: ['android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE'],
  activities: [
    'com.example.quicknotes.MainActivity',
    'com.example.quicknotes.SettingsActivity',
    'com.example.quicknotes.auth.LoginActivity',
  ],
};

export const MOCK_CLASSES: ReaClassInfo[] = [
  {
    name: 'com.example.quicknotes.MainActivity',
    superClassName: 'androidx.appcompat.app.AppCompatActivity',
    methods: ['onCreate(Bundle)', 'onResume()', 'renderNotes()', 'openNote(long)'],
  },
  {
    name: 'com.example.quicknotes.notes.NoteRepository',
    superClassName: 'java.lang.Object',
    methods: ['fetchAll()', 'save(Note)', 'delete(long)', 'sync()'],
  },
  {
    name: 'com.example.quicknotes.notes.NoteAdapter',
    superClassName: 'androidx.recyclerview.widget.RecyclerView.Adapter',
    methods: ['onCreateViewHolder(ViewGroup, int)', 'onBindViewHolder(RecyclerView.ViewHolder, int)', 'getItemCount()'],
  },
  {
    name: 'com.example.quicknotes.auth.LoginActivity',
    superClassName: 'androidx.appcompat.app.AppCompatActivity',
    methods: ['onCreate(Bundle)', 'onLoginClick(View)', 'validateToken(String)'],
  },
];

export const MOCK_METHOD_DETAIL: ReaMethodDetail = {
  className: 'com.example.quicknotes.MainActivity',
  methodName: 'onCreate',
  signature: 'protected void onCreate(Bundle savedInstanceState)',
  source: `protected void onCreate(Bundle savedInstanceState) {
  super.onCreate(savedInstanceState);
  setContentView(R.layout.activity_main);
  this.repo = new NoteRepository(this.getApplicationContext());
  this.adapter = new NoteAdapter(this.repo.fetchAll());
  ((RecyclerView) this.findViewById(R.id.notes_list)).setAdapter(this.adapter);
}`,
};

export const MOCK_REFERENCES: ReaReferenceEdge[] = [
  { from: 'MainActivity.onCreate', to: 'NoteRepository.<init>', kind: 'constructs' },
  { from: 'MainActivity.onCreate', to: 'NoteRepository.fetchAll', kind: 'invokes' },
  { from: 'MainActivity.onCreate', to: 'NoteAdapter.<init>', kind: 'constructs' },
];

export const MOCK_REBUILD: CraftResult = {
  kind: 'rebuild',
  summary:
    'Rebuilt QuickNotes as a React Native (Expo SDK 54) app. Manifest permissions were mapped to app.json, and the three activities became native screens with expo-router.',
  files: [
    {
      path: 'app.json',
      action: 'modify',
      content: `{"expo":{"name":"QuickNotes","slug":"quicknotes","version":"2.3.1","sdkVersion":"54.0.0","android":{"package":"com.example.quicknotes","permissions":["INTERNET","ACCESS_NETWORK_STATE"],"minSdkVersion":24,"targetSdkVersion":34}}}`,
    },
    {
      path: 'app/(tabs)/index.tsx',
      action: 'create',
      content: `import { FlatList, Text, View } from 'react-native';
import { useNoteRepository } from '@/hooks/useNoteRepository';

export default function NotesScreen() {
  const { notes } = useNoteRepository();
  return <FlatList data={notes} keyExtractor={(item) => String(item.id)} renderItem={({ item }) => <Text>{item.title}</Text>} />;
}`,
    },
  ],
  diff: `--- a/app.json
+++ b/app.json
@@
-  "sdkVersion": "52.0.0",
+  "sdkVersion": "54.0.0",`,
  buildStatus: 'passed',
};

export const MOCK_FEATURE: CraftResult = {
  kind: 'feature',
  summary:
    'Injected a dark-mode toggle into MainActivity. The decompiled onCreate logic was ported to a React Native screen and wired to a theme hook with persisted state.',
  files: [
    {
      path: 'app/(tabs)/index.tsx',
      action: 'modify',
      content: `import { FlatList, Text, View, Pressable } from 'react-native';
import { useNoteRepository } from '@/hooks/useNoteRepository';
import { useTheme } from '@/hooks/useTheme';

export default function NotesScreen() {
  const { notes } = useNoteRepository();
  const { isDark, toggle } = useTheme();
  return (
    <View className={isDark ? 'bg-zinc-900 flex-1' : 'bg-white flex-1'}>
      <Pressable onPress={toggle}><Text>{isDark ? 'Light mode' : 'Dark mode'}</Text></Pressable>
      <FlatList data={notes} keyExtractor={(item) => String(item.id)} renderItem={({ item }) => <Text>{item.title}</Text>} />
    </View>
  );
}`,
    },
    {
      path: 'hooks/useTheme.tsx',
      action: 'create',
      content: `import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ isDark: false, toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem('theme').then((v) => setIsDark(v === 'dark'));
  }, []);
  const toggle = () => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };
  return <ThemeContext.Provider value={{ isDark, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);`,
    },
  ],
  diff: `--- a/app/(tabs)/index.tsx
+++ b/app/(tabs)/index.tsx
@@
+import { Pressable } from 'react-native';
+import { useTheme } from '@/hooks/useTheme';
+`,
  buildStatus: 'pending',
};
