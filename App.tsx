import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display/400Regular';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { activeCount, BenchState, commitDraft, Draft, emptyState, freshDraft, latest, Photo, Project } from './src/model';
import { BenchRepository } from './src/repository';
import { keepPhoto, readPhoto, writePhoto, removePhoto } from './src/media';
import { exportBenchBackup, importBenchBackup } from './src/backup';
import { chooseBackup, shareBackup } from './src/backupIO';
import { sampleProject } from './src/samples';
import { colors, fonts } from './src/theme';
import { Body, Button, Eyebrow, Icon, Pill } from './src/components/Primitives';
import { PhotoBoard } from './src/components/PhotoBoard';
import { PrivacyNotice } from './src/components/PrivacyNotice';
import { useBenchkeepPurchases } from './src/purchases/useBenchkeepPurchases';
import { styles } from './src/appStyles';

const repository = new BenchRepository(AsyncStorage);
type Screen = 'bench' | 'piece' | 'capture' | 'about' | 'privacy';
const dateLabel = (value: string) => new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' });

export default function App() {
  const [fontLoaded, fontError] = useFonts({ DMSans_400Regular, DMSans_500Medium, DMSans_700Bold, DMSerifDisplay_400Regular });
  return <SafeAreaProvider><StatusBar style="dark" />{fontLoaded || fontError ? <BenchApp /> : <View style={styles.loading}><ActivityIndicator color={colors.accent} /><Text>Opening the bench…</Text></View>}</SafeAreaProvider>;
}

function BenchApp() {
  const { width } = useWindowDimensions(); const wide = width >= 850;
  const [bench, setBench] = useState<BenchState>(emptyState); const stateRef = useRef(bench);
  const writeLock = useRef(false);
  const [loaded, setLoaded] = useState(false); const [loadFailed, setLoadFailed] = useState(false);
  const [screen, setScreen] = useState<Screen>('bench'); const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<'active' | 'finished'>('active'); const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false); const [photoBusy, setPhotoBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [purchaseOpen, setPurchaseOpen] = useState(false); const purchases = useBenchkeepPurchases();
  const [backupBusy, setBackupBusy] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ state: BenchState; photos: Photo[] } | null>(null);
  const project = bench.projects.find(p => p.id === selected) ?? (selected === sampleProject.id ? sampleProject : undefined);
  const realProjects = bench.projects.filter(p => !p.sample);
  const projects = realProjects.filter(p => tab === 'finished' ? p.status === 'finished' : p.status !== 'finished');
  const installState = (next: BenchState) => { stateRef.current = next; setBench(next); };
  const load = async () => {
    setError(''); setLoadFailed(false);
    try { const result = await repository.load(); installState(result.state); if (result.recovered) setNotice('Your bench was recovered from its last readable backup.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Your bench could not be opened.'); setLoadFailed(true); }
    finally { setLoaded(true); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (purchaseOpen) { setPurchaseOpen(false); return true; }
      if (screen === 'privacy') { setScreen('about'); return true; }
      if (screen !== 'bench') { setScreen('bench'); return true; } return false;
    }); return () => subscription.remove();
  }, [screen, purchaseOpen]);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const listener = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (purchaseOpen) setPurchaseOpen(false); else setScreen('bench'); } };
    window.addEventListener('keydown', listener); return () => window.removeEventListener('keydown', listener);
  }, [purchaseOpen]);
  const save = async (next: BenchState) => {
    if (writeLock.current) return false;
    writeLock.current = true;
    setBusy(true); setError('');
    try { await repository.save(next); installState(next); return true; }
    catch { setError('This change was not saved. Check available storage and try again. Your previous bench is still kept.'); return false; }
    finally { setBusy(false); writeLock.current = false; }
  };
  const changeDraft = (patch: Partial<Draft>) => {
    if (writeLock.current) return;
    const next = { ...stateRef.current, draft: { ...(stateRef.current.draft ?? freshDraft()), ...patch } }; installState(next);
    repository.save(next).catch(() => setError('Your draft could not be saved to this device. Keep this screen open and try saving again.'));
  };
  const begin = async (existing?: Project) => {
    if (existing?.sample) existing = undefined;
    if (!existing && !purchases.isPlus && activeCount(stateRef.current) >= 2) { setPurchaseOpen(true); return; }
    if (stateRef.current.draft && stateRef.current.draft.projectId === existing?.id) { setScreen('capture'); setError(''); return; }
    if (stateRef.current.draft && (stateRef.current.draft.photo || stateRef.current.draft.title || stateRef.current.draft.nextMove)) { setScreen('capture'); setNotice('Your unfinished checkpoint is waiting here. Save or discard it before starting another.'); return; }
    let next = { ...stateRef.current, draft: freshDraft(existing) };
    if (existing?.sample && !next.projects.some(p => p.id === existing.id)) next.projects = [existing, ...next.projects];
    if (await save(next)) setScreen('capture');
  };
  const pick = async (camera = false) => {
    setError('');
    try {
      if (camera) { const permission = await ImagePicker.requestCameraPermissionsAsync(); if (!permission.granted) { setError('Camera access is off. Choose a photo instead, or enable the camera in device settings.'); return; } }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: false, quality: 1, exif: false };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets?.[0]) return;
      setBusy(true); setPhotoBusy(true); const asset = result.assets[0];
      const photo = await keepPhoto({ uri: asset.uri, width: asset.width, height: asset.height }); changeDraft({ photo, pin: null });
    } catch (e) { setError(e instanceof Error ? e.message : 'That photo could not be added. Please try another image.'); }
    finally { setBusy(false); setPhotoBusy(false); }
  };
  const savePoint = async () => {
    try { const result = commitDraft(stateRef.current, purchases.isPlus); if (await save(result.state)) { setSelected(result.projectId); setFocused(false); setScreen('piece'); setNotice('Point saved. Your next move is here whenever you return.'); } }
    catch (e) { setError(e instanceof Error ? e.message : 'Complete the checkpoint before saving.'); }
  };
  const changeStatus = async (p: Project, status: Project['status']) => {
    const nextProject = { ...p, status, updatedAt: new Date().toISOString() };
    if (await save({ ...stateRef.current, projects: [nextProject, ...stateRef.current.projects.filter(item => item.id !== p.id)] })) setNotice(status === 'making' ? 'Welcome back. Your saved point stays here while you make.' : status === 'finished' ? 'A piece finished. Every saved point stays in your archive.' : 'Your piece is back on the bench.');
  };
  const openProject = (p: Project) => { setSelected(p.id); setScreen('piece'); setFocused(false); setError(''); };
  const shareNotes = async (p: Project) => {
    const message = `${p.title}\nSaved with Benchkeep\n\n${p.checkpoints.map((c, i) => `POINT ${i + 1} · ${dateLabel(c.createdAt)}\nNext move: ${c.nextMove}\n${c.detail ? `Keep in mind: ${c.detail}\n` : ''}Photo position: ${Math.round(c.pin.x * 100)}% across, ${Math.round(c.pin.y * 100)}% down.`).join('\n\n')}`;
    try {
      if (Platform.OS === 'web') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([message], { type: 'text/plain;charset=utf-8' })); a.download = `${p.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-notes.txt`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
      else await Share.share({ message, title: `${p.title} — Benchkeep notes` });
    } catch { setError('The notes could not be shared. Please try again.'); }
  };
  const count = activeCount(bench);
  const exportBackup = async () => {
    setBackupBusy(true); setError('');
    try { const contents = await exportBenchBackup(stateRef.current, { readPhoto }); await shareBackup(contents); setNotice('Backup prepared with your photos, notes and points. Keep the file somewhere safe.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'This backup could not be prepared. No data was removed.'); }
    finally { setBackupBusy(false); }
  };
  const selectImport = async () => {
    setBackupBusy(true); setError(''); const photos: Photo[] = [];
    try {
      const raw = await chooseBackup(); if (raw === null) return;
      const state = await importBenchBackup(raw, { writePhoto: async (data, w, h) => { const p = await writePhoto(data, w, h); photos.push(p); return p; }, removePhoto });
      setPendingImport({ state, photos });
    } catch (e) { setError(e instanceof Error ? e.message : 'This backup could not be opened. Your current bench was kept.'); }
    finally { setBackupBusy(false); }
  };
  const cancelImport = async () => { if (writeLock.current) return; if (pendingImport) await Promise.allSettled(pendingImport.photos.map(removePhoto)); setPendingImport(null); };
  if (!loaded) return <View style={styles.loading}><ActivityIndicator color={colors.accent} /><Body>Opening your saved bench…</Body></View>;
  if (loadFailed) return <View style={styles.loading}><Heading title="Your bench is still here." subtitle={error} /><Button onPress={load}>Try opening again</Button></View>;

  return <SafeAreaView style={styles.app} edges={['top', 'left', 'right']}>
    <View style={styles.header}><View style={styles.headerInner}>
      <Pressable accessibilityRole="button" accessibilityLabel="Benchkeep home" onPress={() => { setScreen('bench'); setError(''); }} style={styles.brand}><View style={styles.brandMark}><Icon name="pin" color={colors.surface} size={21} /></View><Text style={styles.wordmark}>benchkeep<Text style={{ color: colors.accent }}>.</Text></Text></Pressable>
      <View style={styles.row}>{wide && <Button variant="ghost" onPress={() => setScreen('about')}>A place to pick up</Button>}<Button variant="secondary" onPress={() => setPurchaseOpen(true)}>{purchases.isPlus ? 'Full bench ✓' : 'Full bench'}</Button></View>
    </View></View>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}><ScrollView key={screen} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled"><View style={styles.content}>
      {(error || notice) && <View accessibilityRole="alert" style={[styles.banner, error ? styles.errorBanner : styles.noticeBanner]}><Body style={{ color: error ? colors.error : colors.moss, flex: 1 }}>{error || notice}</Body><Button variant="ghost" icon="close" label="Dismiss message" onPress={() => { setError(''); setNotice(''); }} /></View>}
      {screen === 'bench' && <>
        <View style={[styles.intro, wide && styles.introWide]}>
          <View style={{ flex: 1, gap: 14 }}><Eyebrow>FOR THE THINGS YOU MAKE</Eyebrow><Text accessibilityRole="header" style={[styles.heroTitle, !wide && { fontSize: 43, lineHeight: 47 }]}>{realProjects.length ? 'Back to the bench.' : 'A little pause.\nA place to return.'}</Text><Body style={{ maxWidth: 390, fontSize: 16, lineHeight: 26 }}>Keep the exact spot, the next move, and the little detail you don’t want to forget.</Body></View>
          <View style={{ gap: 12, alignItems: wide ? 'flex-end' : 'flex-start', justifyContent: 'flex-end' }}><Button icon="plus" onPress={() => begin()} disabled={busy}>Save a new point</Button><Body style={{ fontSize: 12 }}>{purchases.isPlus ? 'Room for every piece you’re making.' : count > 2 ? `${count} active pieces · new pieces need Full bench` : `${count} of 2 active pieces · free bench`}</Body></View>
        </View>
        {bench.draft && (bench.draft.photo || bench.draft.title || bench.draft.nextMove) && <Pressable accessibilityRole="button" onPress={() => setScreen('capture')} style={styles.draftBanner}><View style={{ gap: 4, flex: 1 }}><Eyebrow>UNFINISHED CHECKPOINT</Eyebrow><Text style={styles.smallTitle}>{bench.draft.title || 'A point you started saving'}</Text></View><Icon name="arrow" /></Pressable>}
        <View style={styles.sectionBar}><View style={styles.tabs}>{(['active', 'finished'] as const).map(t => <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}><Text style={[styles.tabText, tab === t && { color: colors.ink }]}>{t === 'active' ? 'On the bench' : 'Finished'} <Text style={{ color: colors.muted }}>{realProjects.filter(p => t === 'active' ? p.status !== 'finished' : p.status === 'finished').length}</Text></Text></Pressable>)}</View>{wide && <Eyebrow>GOOD THINGS TAKE A FEW SESSIONS</Eyebrow>}</View>
        {projects.length > 0 ? <View style={[styles.grid, wide && { flexDirection: 'row', flexWrap: 'wrap' }]}>{projects.map(p => <View key={p.id} style={[styles.projectCard, wide && { width: '48.8%' }]}><Pressable accessibilityRole="button" accessibilityLabel={`Open ${p.title}`} onPress={() => openProject(p)}><PhotoBoard photo={latest(p).photo} pin={latest(p).pin} /><View style={styles.cardBody}><View style={[styles.row, { justifyContent: 'space-between' }]}><Pill green={p.status === 'finished'}>{p.status === 'finished' ? 'Finished' : p.status === 'making' ? 'Making again' : 'Ready when you are'}</Pill><Text style={styles.meta}>{dateLabel(p.updatedAt)}</Text></View><Text style={styles.cardTitle}>{p.title}</Text><Body numberOfLines={2}>{latest(p).nextMove}</Body><View style={[styles.row, { marginTop: 16 }]}><Text style={styles.actionText}>Pick up here</Text><Icon name="arrow" color={colors.accent} size={18} /></View></View></Pressable></View>)}</View>
        : tab === 'finished' ? <View style={styles.empty}><Icon name="leaf" size={38} color={colors.moss} /><Text style={styles.cardTitle}>Good work will live here.</Text><Body>Finish a piece to keep its whole trail of saved points.</Body><Button variant="secondary" onPress={() => setTab('active')}>Back to your bench</Button></View>
        : <View style={[styles.sampleFeature, wide && { flexDirection: 'row' }]}><View style={{ flex: wide ? 1.2 : undefined }}><PhotoBoard photo={latest(sampleProject).photo} pin={latest(sampleProject).pin} /></View><View style={[styles.sampleCopy, wide && { flex: 1 }]}><Pill>Try a sample</Pill><Text style={styles.sampleTitle}>{'Leave yourself\na way back.'}</Text><Body>The rust leaf is half finished. One saved point keeps the next stitch from getting lost.</Body><Button variant="secondary" icon="arrow" onPress={() => openProject(sampleProject)} style={{ alignSelf: 'flex-start', marginTop: 10 }}>Explore the saved point</Button><Text style={styles.sampleLabel}>Sample project · generated image</Text></View></View>}
        <View style={[styles.bottomNote, wide && { flexDirection: 'row' }]}><View style={[styles.row, { flex: 1 }]}><Icon name="pin" color={colors.accent} /><Body style={{ fontSize: 13 }}>Photo. Point. Next move.</Body></View><Button variant="ghost" onPress={() => setScreen('about')}>About & privacy</Button></View>
      </>}

      {screen === 'capture' && bench.draft && <>
        <Button variant="ghost" icon="back" onPress={() => setScreen('bench')} style={styles.back}>Back to the bench</Button><Heading title={bench.draft.projectId ? 'Where are you leaving it?' : 'Leave a point for later.'} subtitle="One photo, one place, one next move. Your draft saves as you go." />
        <View style={[styles.editorLayout, wide && { flexDirection: 'row' }]}><View style={{ flex: 1.15, gap: 12 }}>
          {bench.draft.photo ? <PhotoBoard photo={bench.draft.photo} pin={bench.draft.pin} editing={!busy} onPin={pin => changeDraft({ pin })} /> : <Pressable accessibilityRole="button" accessibilityLabel="Choose a photo of your piece" onPress={() => pick()} style={styles.photoPlaceholder}><View style={styles.cameraCircle}><Icon name="camera" size={32} color={colors.accent} /></View><Text style={styles.cardTitle}>Start with the piece.</Text><Body style={{ textAlign: 'center', maxWidth: 280 }}>Take a photo or choose one. Then mark the spot you’ll return to.</Body></Pressable>}
          <View style={styles.row}><Button icon="image" variant="secondary" onPress={() => pick()} disabled={busy} style={{ flex: 1 }}>{bench.draft.photo ? 'Change photo' : 'Choose photo'}</Button><Button icon="camera" variant="secondary" onPress={() => pick(true)} disabled={busy} style={{ flex: 1 }}>Camera</Button></View><Body style={{ fontSize: 12 }}>A fresh photo gets a fresh point. The original image is left untouched.</Body>
        </View><View style={[styles.form, { flex: 1 }]}>
          <Field disabled={busy} label="NAME OF YOUR PIECE" value={bench.draft.title} onChange={title => changeDraft({ title })} placeholder="The autumn leaves" maxLength={80} />
          <Field disabled={busy} label="YOUR NEXT MOVE" value={bench.draft.nextMove} onChange={nextMove => changeDraft({ nextMove })} placeholder="Finish the right half of the rust leaf." multiline maxLength={280} hint="Make it something you can do when you return." />
          <Field disabled={busy} label="KEEP IN MIND · OPTIONAL" value={bench.draft.detail} onChange={detail => changeDraft({ detail })} placeholder="Two strands. Keep the same stitch angle." multiline maxLength={500} />
          <Button icon="pin" onPress={savePoint} disabled={busy}>{photoBusy ? 'Preparing your photo…' : busy ? 'Saving your point…' : 'Save this point'}</Button>{error && <Text accessibilityRole="alert" style={styles.formError}>{error}</Text>}
          <Button variant="ghost" onPress={async () => { if (await save({ ...stateRef.current, draft: null })) setScreen('bench'); }}>Discard this draft</Button>
        </View></View>
      </>}

      {screen === 'piece' && project && <>
        <Button variant="ghost" icon="back" onPress={() => setScreen('bench')} style={styles.back}>Your bench</Button>
        <View style={[styles.pieceHeader, wide && { flexDirection: 'row', alignItems: 'center' }]}><View style={{ flex: 1, gap: 10 }}><Eyebrow>{project.sample ? 'SAMPLE PROJECT · GENERATED IMAGE' : `${project.checkpoints.length} SAVED ${project.checkpoints.length === 1 ? 'POINT' : 'POINTS'}`}</Eyebrow><Text accessibilityRole="header" style={styles.pageTitle}>{project.title}</Text></View><Pill green={project.status === 'finished'}>{project.status === 'making' ? 'Making again' : project.status === 'finished' ? 'Finished, and kept' : 'Ready when you are'}</Pill></View>
        <View style={[styles.editorLayout, wide && { flexDirection: 'row' }]}><View style={{ flex: 1.3, gap: 12 }}><PhotoBoard photo={latest(project).photo} pin={latest(project).pin} focused={focused} /><View style={[styles.row, { justifyContent: 'space-between' }]}><Body style={{ fontSize: 12 }}>Your point stays in the same place.</Body><Button variant="ghost" icon="focus" onPress={() => setFocused(!focused)}>{focused ? 'Whole piece' : 'Look closer'}</Button></View></View>
          <View style={[styles.resumePanel, { flex: 1 }]}><View style={styles.numberMark}><Text style={styles.numberText}>{String(project.checkpoints.length).padStart(2, '0')}</Text></View><Eyebrow>YOUR NEXT MOVE</Eyebrow><Text style={styles.nextMove}>{latest(project).nextMove}</Text>{latest(project).detail ? <View style={styles.detailNote}><Eyebrow>KEEP IN MIND</Eyebrow><Body style={{ color: colors.ink }}>{latest(project).detail}</Body></View> : null}
            {project.status === 'paused' && <Button icon="arrow" onPress={() => changeStatus(project, 'making')} disabled={busy}>Continue from here</Button>}
            {project.status === 'making' && <Button icon="pin" onPress={() => begin(project)} disabled={busy}>Save the next point</Button>}
            {project.status !== 'finished' ? <Button variant="ghost" icon="check" onPress={() => changeStatus(project, 'finished')} disabled={busy}>This piece is finished</Button> : <Button variant="secondary" onPress={() => { if (!project.sample && !purchases.isPlus && count >= 2) { setPurchaseOpen(true); return; } changeStatus(project, 'paused'); }}>Put back on the bench</Button>}
            <Text style={styles.meta}>Saved {dateLabel(latest(project).createdAt)} · kept on this device</Text>
          </View>
        </View>
        <View style={styles.historyHeader}><Text style={styles.sectionTitle}>The trail so far</Text><Button variant="ghost" icon="download" onPress={() => shareNotes(project)}>Export notes</Button></View><View style={styles.timeline}>{[...project.checkpoints].reverse().map((c, i) => <View key={c.id} style={styles.timelineRow}><View style={styles.timelineDot} /><View style={{ flex: 1, gap: 5 }}><Eyebrow>POINT {String(project.checkpoints.length - i).padStart(2, '0')} · {dateLabel(c.createdAt)}</Eyebrow><Text style={styles.smallTitle}>{c.nextMove}</Text>{c.detail ? <Body style={{ fontSize: 13 }}>{c.detail}</Body> : null}</View>{i === 0 && <Pill green>Latest</Pill>}</View>)}</View>
      </>}

      {screen === 'about' && <><Button variant="ghost" icon="back" onPress={() => setScreen('bench')} style={styles.back}>Your bench</Button><View style={{ maxWidth: 650, gap: 24 }}><Eyebrow>A LITTLE MORE ABOUT BENCHKEEP</Eyebrow><Heading title="For work worth returning to." subtitle="Making rarely happens in one sitting. Benchkeep keeps a visual bookmark in the piece you left on the table." /><Info title="Three small things" text="Save a photo, put a point on the spot, and write your next move. When you return, everything you need to start again is together." /><Info title="Yours, on this device" text="Photos and project notes are stored locally. No account is needed. Uninstalling the app or clearing browser data can remove them. A portable backup includes your photos and points. The smaller notes export contains text only. Keep a backup outside this device." /><Info title="A bench with room to grow" text="The free bench holds two active pieces. Finished pieces remain readable. Full bench is a one-time upgrade for more active pieces, when purchasing is available. RevenueCat manages purchase information; your project photos and text are not sent to it." /><Info title="About the example" text="The autumn leaves is a fictional sample. Its embroidery image was generated to demonstrate a saved point; it does not represent a user’s finished work." /><Button variant="secondary" onPress={() => setScreen('privacy')}>Privacy notice & support</Button><Body style={{ fontSize: 12 }}>Benchkeep · version 1.0.0</Body></View></>}
      {screen === 'privacy' && <PrivacyNotice onBack={() => setScreen('about')} />}
      {screen === 'about' && <View style={{ maxWidth: 650, gap: 14, marginTop: 28, paddingTop: 24, borderTopWidth: 1, borderColor: colors.line }}><Text style={styles.sectionTitle}>Take your bench with you.</Text><Body>Save a portable backup with photos, notes and saved points. Backups are limited to 25 MiB and exclude the built-in sample.</Body><View style={[styles.row, { flexWrap: 'wrap' }]}><Button icon="download" onPress={exportBackup} disabled={backupBusy}>{backupBusy ? 'Preparing your backup…' : 'Export full backup'}</Button><Button variant="secondary" onPress={selectImport} disabled={backupBusy}>Import a backup</Button></View><Body style={{ fontSize: 12 }}>Importing replaces the bench on this device after you confirm. It does not restore purchases.</Body></View>}
    </View></ScrollView></KeyboardAvoidingView>

    <Modal visible={!!pendingImport} transparent animationType="none" onRequestClose={cancelImport}><View style={styles.modalBackdrop}><View style={styles.modalScroll}><View accessibilityViewIsModal style={styles.purchaseSheet}><Eyebrow>IMPORT YOUR BENCH</Eyebrow><Text accessibilityRole="header" style={styles.purchaseTitle}>Replace this bench?</Text><Body>This backup contains {pendingImport?.state.projects.length ?? 0} pieces and their photos. It will replace the {realProjects.length} pieces currently on this device. Export your current bench first if you want to keep both.</Body><Button disabled={busy} onPress={async () => { if (pendingImport && await save(pendingImport.state)) { setPendingImport(null); setScreen('bench'); setSelected(null); setNotice('Your bench was imported, including its photos and saved points.'); } }}>{busy ? 'Saving imported bench…' : 'Replace with this backup'}</Button><Button variant="secondary" onPress={cancelImport} disabled={busy}>Keep my current bench</Button></View></View></View></Modal>

    <Modal visible={purchaseOpen} transparent animationType="none" onRequestClose={() => setPurchaseOpen(false)}><View style={styles.modalBackdrop}><ScrollView contentContainerStyle={styles.modalScroll}><View accessibilityViewIsModal style={styles.purchaseSheet}><View style={[styles.row, { justifyContent: 'space-between' }]}><Eyebrow>FULL BENCH</Eyebrow><Button variant="ghost" icon="close" label="Close Full bench" onPress={() => setPurchaseOpen(false)} /></View><View style={styles.upgradeArt}><Icon name="leaf" size={46} color={colors.moss} /><Icon name="pin" size={34} color={colors.accent} /></View><Text accessibilityRole="header" style={styles.purchaseTitle}>{purchases.isPlus ? 'Room for every idea.' : 'A little more room\nto make.'}</Text><Body>Keep every piece in progress together. One purchase opens your bench to more active projects.</Body><View style={styles.features}><Feature>More than two active pieces</Feature><Feature>All your saved points stay yours</Feature><Feature>A single purchase. No subscription.</Feature></View>{purchases.sandbox && <Pill>Test purchase · no real charge</Pill>}{purchases.isPlus ? <Pill green>Full bench is unlocked</Pill> : <Button onPress={async () => { const r = await purchases.purchase(); if (r.status === 'purchased') setNotice('Full bench is unlocked. There’s room for your next piece.'); }} disabled={purchases.busy || purchases.status !== 'ready' || !purchases.product}>{purchases.busy ? 'Checking your purchase…' : purchases.product ? `Unlock · ${purchases.product.price}` : 'Purchasing isn’t available here yet'}</Button>}{purchases.message && purchases.message !== 'Full bench is unlocked.' && <Body style={{ fontSize: 12 }}>{purchases.message}</Body>}<Button variant="ghost" onPress={() => purchases.restore()} disabled={purchases.busy}>{purchases.sandbox && Platform.OS === 'web' ? 'Refresh test access' : 'Restore a purchase'}</Button><Body style={{ fontSize: 12, textAlign: 'center' }}>Reading your existing pieces and exporting notes always stay available.</Body></View></ScrollView></View></Modal>
  </SafeAreaView>;
}

function Heading({ title, subtitle }: { title: string; subtitle?: string }) { return <View style={{ gap: 10, marginBottom: 28 }}><Text accessibilityRole="header" style={styles.pageTitle}>{title}</Text>{subtitle && <Body>{subtitle}</Body>}</View>; }
function Field({ disabled, label, value, onChange, placeholder, hint, multiline = false, maxLength }: { disabled?: boolean; label: string; value: string; onChange: (v: string) => void; placeholder: string; hint?: string; multiline?: boolean; maxLength: number }) {
  const [focused, setFocused] = useState(false);
  return <View style={{ gap: 8 }}><Eyebrow>{label}</Eyebrow><TextInput editable={!disabled} accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.muted} multiline={multiline} maxLength={maxLength} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={[styles.input, multiline && { minHeight: 110, textAlignVertical: 'top' }, focused && { borderColor: colors.accent, borderWidth: 2 }]} />{hint && <Body style={{ fontSize: 12 }}>{hint}</Body>}</View>;
}
function Info({ title, text }: { title: string; text: string }) { return <View style={{ gap: 8 }}><Text style={styles.sectionTitle}>{title}</Text><Body>{text}</Body></View>; }
function Feature({ children }: React.PropsWithChildren) { return <View style={styles.row}><Icon name="check" color={colors.moss} size={18} /><Body style={{ color: colors.ink, fontSize: 14 }}>{children}</Body></View>; }
