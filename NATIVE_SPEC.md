# NATIVE_SPEC — ruehl-native

**Purpose:** Definitive reference for the **web** repository (`ruehl-app`) to match **Expo / React Native** app behavior, visual language, and product semantics. This document was produced by a read-only audit of the `ruehl-native` tree; it is not a runtime contract.

**Last audit note:** Generator is a static read of the repo; not every string/hex was machine-exhaustive. Where a value is inferred from a representative file, it is called out in **§25**.

---

## 1. Color Palette (grep-exhaustive snapshot)

**Method:** Recursive scan of `*.ts`, `*.tsx`, `*.js`, `*.jsx`, `*.css`, and root `app.json`; excluded `node_modules`, `.next`, `dist`. Hex via regex `#[0-9a-fA-F]{3,8}\b`; rgba/rgb via `rgba?(...)`. **Not captured:** named colors (`red`, `transparent`), `hsl()`, platform dynamic colors unless they spell hex/rgba in source.

**Summary:** Hex literal occurrences: **1017** · Unique hex tokens: **82**. RGBA/RGB occurrences: **1067** · Unique rgba/rgb strings: **163**.

Additional config: `app/globals.css` sets `background: #000`, `color: #fff`; `app.json` uses `#000000` for splash backgrounds (3 occurrences).

### 1.1 Canonical vs drift (hex frequency heuristic)

**Likely design tokens (≥5 uses):** `#FFF` (565), `#000` (143), `#111` (58), `#2A2A2A` (32), `#EF4444` (21), `#4FC3F7` (16), `#22C55E` (15), `#1A1A1A` (9), `#A855F7`, `#1E1E1E`, `#101010` (6 each), `#FFFFFF`, `#FDA4AF`, `#00FFAA`, `#000000` (5 each).

**Single-use hex (possible one-off / drift — 34 values):** includes `#03160A`, `#04121B`, `#59606B`, `#8F96A3`, `#D1D5DB`, `#F8FAFC` (creator nav FAB stack), `#E1306C`, `#25D366`, `#34C759`, `#FFFC00`, `#2563EB`, `#FF2D96`, `#FF5A5F`, `#FFB3B3`, brand-adjacent greens in `creatorStatus.ts`, lyric gradient chips in `CreateScreen`, etc. Treat as **verify before web tokenization**.

**Note:** `#FFF` vs `#FFFFFF` both appear — normalization recommended for web tokens.

### 1.2 Shadow / elevation color tokens (from hex/rgba scan)

- **Tab bar / Explore cutout:** `shadowColor: #d1d5db` (`App.tsx`), `rgba(0,0,0,0.88)` nav well.
- **Share sheet brand tiles:** Instagram `#E1306C`, WhatsApp `#25D366`, Snapchat `#FFFC00`, Messages `#34C759`, More `#2a2a2a`, etc.

### 1.3 Full inventories (every file:line)

The blocks below are **verbatim** script output (each bullet is `relative/path:line`).

# HEX COLOR INVENTORY
Total hex token occurrences: 1017. Unique hex values: 82.
Top frequencies: #FFF×565, #000×143, #111×58, #2A2A2A×32, #EF4444×21, #4FC3F7×16, #22C55E×15, #1A1A1A×9, #A855F7×6, #1E1E1E×6, #101010×6, #FFFFFF×5, #FDA4AF×5, #00FFAA×5, #000000×5, #FF4D6D×4, #1ED760×4, #0F0F0F×4, #0D0D0D×4, #0C0C0C×4, #EC4899×3, #D946EF×3, #CF65E7×3, #C084FC×3, #A1A1AA×3, #7C3AED×3, #4ADE80×3, #161616×3, #151515×3, #131316×3, #FFB8B8×2, #FF8F8F×2, #F59E0B×2, #C4B5FD×2, #8B5CF6×2, #888×2, #60A5FA×2, #5B2424×2, #4CAF50×2, #2A1212×2, #22D3EE×2, #1F1F1F×2, #0B0B0B×2, #0A0A0A×2, #060606×2, #050505×2, #040404×2, #00FFB2×2, #FFFC00×1, #FFB3B3×1

#### `#000` — 143 occurrence(s)
- AccountScreen.tsx:89
- App.tsx:238
- App.tsx:1737
- App.tsx:2086
- SoundPageScreen.tsx:430
- SoundPageScreen.tsx:511
- MessagesScreen.tsx:89
- SoundDetailScreen.tsx:372
- SoundDetailScreen.tsx:380
- SoundDetailScreen.tsx:390
- SoundDetailScreen.tsx:461
- AnalyticsScreen.tsx:460
- AuthScreen.tsx:52
- AuthScreen.tsx:173
- AuthScreen.tsx:333
- AuthScreen.tsx:1467
- AuthScreen.tsx:1568
- SoundChartScreen.tsx:97
- NotificationsScreen.tsx:126
- HomeFeedScreen.tsx:4376
- HomeFeedScreen.tsx:4489
- HomeFeedScreen.tsx:4913
- HomeFeedScreen.tsx:4914
- HomeFeedScreen.tsx:4943
- HomeFeedScreen.tsx:4944
- HomeFeedScreen.tsx:4973
- HomeFeedScreen.tsx:4986
- HomeFeedScreen.tsx:4987
- HomeFeedScreen.tsx:5010
- HomeFeedScreen.tsx:5029
- HomeFeedScreen.tsx:5040
- HomeFeedScreen.tsx:5054
- HomeFeedScreen.tsx:5151
- HomeFeedScreen.tsx:5451
- HomeFeedScreen.tsx:5502
- HomeFeedScreen.tsx:5717
- ActivityScreen.tsx:58
- ActivityScreen.tsx:61
- ChatScreen.tsx:1377
- ChatScreen.tsx:1381
- ChatScreen.tsx:1484
- ChatScreen.tsx:1565
- ChatScreen.tsx:1705
- ChatScreen.tsx:1713
- SessionScreen.tsx:38
- CreateScreen.tsx:4505
- CreateScreen.tsx:4698
- CreateScreen.tsx:4723
- CreateScreen.tsx:4781
- CreateScreen.tsx:4806
- CreateScreen.tsx:4829
- CreateScreen.tsx:4849
- CreateScreen.tsx:4999
- CreateScreen.tsx:5496
- CreateScreen.tsx:5508
- CreateScreen.tsx:5514
- CreateScreen.tsx:5560
- CreateScreen.tsx:5562
- CreateScreen.tsx:5618
- CreateScreen.tsx:5633
- CreateScreen.tsx:5633
- CreateScreen.tsx:5651
- CreateScreen.tsx:5707
- CreateScreen.tsx:5774
- CreateScreen.tsx:5844
- CreateScreen.tsx:5850
- CreateScreen.tsx:5909
- CreateScreen.tsx:5986
- CreateScreen.tsx:6002
- CreateScreen.tsx:6104
- CreateScreen.tsx:6110
- CreateScreen.tsx:6706
- CreateScreen.tsx:6706
- CreateScreen.tsx:6808
- CreateScreen.tsx:6884
- CreateScreen.tsx:6960
- CreateScreen.tsx:6963
- CreateScreen.tsx:7224
- ProfileScreen.tsx:2145
- ProfileScreen.tsx:2171
- ProfileScreen.tsx:2196
- ProfileScreen.tsx:2589
- ProfileScreen.tsx:3141
- ProfileScreen.tsx:3163
- ProfileScreen.tsx:3186
- ProfileScreen.tsx:3196
- ProfileScreen.tsx:3210
- ProfileScreen.tsx:3222
- ProfileScreen.tsx:3226
- ProfileScreen.tsx:3314
- ProfileScreen.tsx:3355
- ProfileScreen.tsx:3371
- ProfileScreen.tsx:3402
- ProfileScreen.tsx:3769
- FollowListScreen.tsx:63
- PrivacyScreen.tsx:120
- PrivacyScreen.tsx:125
- EditProfileScreen.tsx:123
- EditProfileScreen.tsx:136
- SettingsScreen.tsx:65
- SettingsScreen.tsx:131
- SettingsScreen.tsx:136
- ExploreScreen.tsx:976
- SecurityScreen.tsx:142
- AboutScreen.tsx:18
- IdentityScreen.tsx:1075
- VerificationScreen.tsx:53
- VerificationScreen.tsx:545
- PostDetailScreen.tsx:856
- PostDetailScreen.tsx:936
- PostDetailScreen.tsx:945
- PostDetailScreen.tsx:963
- PostDetailScreen.tsx:970
- app/globals.css:11
- screens/EditTaglineScreen.tsx:119
- screens/ProfileDisplayScreen.tsx:24
- screens/AccountTypeScreen.tsx:47
- screens/TrustedDevicesScreen.tsx:172
- screens/TrustedDevicesScreen.tsx:248
- screens/TrustedDevicesScreen.tsx:255
- screens/TrustedDevicesScreen.tsx:285
- screens/DropComposerScreen.tsx:45
- components/MusicPicker.tsx:539
- components/MusicPicker.tsx:729
- components/MusicPicker.tsx:729
- components/StoryViewer.tsx:263
- components/CreatePickerSheet.tsx:13
- components/HomePostPreview.tsx:1070
- components/HomePostPreview.tsx:1619
- components/HomePostPreview.tsx:1683
- components/ExploreReelCard.tsx:133
- components/ExploreReelCard.tsx:137
- components/ExploreReelCard.tsx:186
- components/ShareSheet.tsx:150
- components/ShareSheet.tsx:152
- components/ShareSheet.tsx:198
- components/AccountTypePicker.tsx:36
- components/AccountTypePicker.tsx:235
- components/AccountTypePicker.tsx:254
- components/HomeNowFeedCard.tsx:231
- components/AddAccountModal.tsx:94
- components/OTPVerificationModal.tsx:103
- components/AccountTypeConfirmModal.tsx:69

#### `#000000` — 5 occurrence(s)
- app.json:11
- app.json:28
- app.json:50
- components/HomePowrPreview.tsx:776
- components/HomePowrPreview.tsx:783

#### `#00FFAA` — 5 occurrence(s)
- PostDetailScreen.tsx:1065
- PostDetailScreen.tsx:1066
- components/HomePostPreview.tsx:1014
- components/HomePostPreview.tsx:1755
- components/HomePostPreview.tsx:1756

#### `#00FFB2` — 2 occurrence(s)
- NotificationsScreen.tsx:103
- components/HomePostPreview.tsx:635

#### `#03160A` — 1 occurrence(s)
- services/creatorStatus.ts:63

#### `#040404` — 2 occurrence(s)
- AnalyticsScreen.tsx:282
- ProfileScreen.tsx:3270

#### `#04121B` — 1 occurrence(s)
- services/creatorStatus.ts:74

#### `#050505` — 2 occurrence(s)
- CreateScreen.tsx:6086
- IdentityScreen.tsx:767

#### `#060606` — 2 occurrence(s)
- IdentityScreen.tsx:760
- IdentityScreen.tsx:824

#### `#0A0A0A` — 2 occurrence(s)
- CreateScreen.tsx:6566
- components/CreatePickerSheet.tsx:79

#### `#0B0B0B` — 2 occurrence(s)
- SoundPageScreen.tsx:392
- app/explore/page.tsx:426

#### `#0C0C0C` — 4 occurrence(s)
- HomeFeedScreen.tsx:5602
- HomeFeedScreen.tsx:5664
- ProfileScreen.tsx:3663
- ProfileScreen.tsx:3716

#### `#0D0D0D` — 4 occurrence(s)
- CreateScreen.tsx:4305
- ProfileScreen.tsx:2934
- components/MusicPicker.tsx:266
- components/GifPicker.tsx:96

#### `#0E0E0E` — 1 occurrence(s)
- ProfileScreen.tsx:3184

#### `#0F0F0F` — 4 occurrence(s)
- CreateScreen.tsx:5767
- ProfileScreen.tsx:3626
- PostDetailScreen.tsx:673
- PostDetailScreen.tsx:1035

#### `#101010` — 6 occurrence(s)
- CreateScreen.tsx:6021
- CreateScreen.tsx:6537
- ProfileScreen.tsx:2160
- PostDetailScreen.tsx:1166
- components/HomeNowFeedCard.tsx:159
- components/HomeNowFeedCard.tsx:217

#### `#111` — 58 occurrence(s)
- SoundDetailScreen.tsx:623
- SoundDetailScreen.tsx:626
- SoundDetailScreen.tsx:637
- HomeFeedScreen.tsx:4919
- HomeFeedScreen.tsx:4949
- HomeFeedScreen.tsx:5463
- HomeFeedScreen.tsx:5686
- HomeFeedScreen.tsx:5693
- HomeFeedScreen.tsx:5700
- HomeFeedScreen.tsx:5705
- CreateScreen.tsx:5458
- CreateScreen.tsx:5461
- CreateScreen.tsx:5464
- CreateScreen.tsx:5467
- CreateScreen.tsx:5470
- CreateScreen.tsx:5491
- CreateScreen.tsx:5506
- CreateScreen.tsx:5512
- CreateScreen.tsx:5574
- CreateScreen.tsx:5604
- CreateScreen.tsx:5616
- CreateScreen.tsx:5623
- CreateScreen.tsx:5638
- CreateScreen.tsx:5669
- CreateScreen.tsx:5675
- CreateScreen.tsx:5702
- CreateScreen.tsx:5842
- CreateScreen.tsx:5848
- CreateScreen.tsx:5854
- CreateScreen.tsx:5855
- CreateScreen.tsx:5856
- CreateScreen.tsx:5857
- CreateScreen.tsx:5879
- CreateScreen.tsx:5887
- CreateScreen.tsx:5888
- CreateScreen.tsx:5889
- CreateScreen.tsx:5890
- CreateScreen.tsx:5984
- CreateScreen.tsx:6000
- CreateScreen.tsx:6745
- CreateScreen.tsx:6816
- CreateScreen.tsx:7103
- CreateScreen.tsx:7285
- ProfileScreen.tsx:2752
- ProfileScreen.tsx:3184
- ProfileScreen.tsx:3738
- ProfileScreen.tsx:3745
- ProfileScreen.tsx:3752
- ProfileScreen.tsx:3757
- components/HomePostPreview.tsx:1484
- components/HomePostPreview.tsx:1490
- components/HomePostPreview.tsx:1632
- components/PostRasterImage.tsx:14
- components/PostRasterImage.tsx:26
- components/PostRasterImage.tsx:33
- components/ShareSheet.tsx:236
- components/HomeNowFeedCard.tsx:139
- components/AccountTypeConfirmModal.tsx:27

#### `#111111` — 1 occurrence(s)
- services/creatorStatus.ts:84

#### `#121212` — 1 occurrence(s)
- CreateScreen.tsx:5937

#### `#131316` — 3 occurrence(s)
- CreateScreen.tsx:153
- CreateScreen.tsx:4662
- CreateScreen.tsx:4690

#### `#151515` — 3 occurrence(s)
- CreateScreen.tsx:5925
- components/HomePowrPreview.tsx:877
- components/HomePowrPreview.tsx:912

#### `#161616` — 3 occurrence(s)
- HomeFeedScreen.tsx:5474
- ProfileScreen.tsx:3167
- ProfileScreen.tsx:3172

#### `#1A1200` — 1 occurrence(s)
- services/creatorStatus.ts:52

#### `#1A1A1A` — 9 occurrence(s)
- HomeFeedScreen.tsx:5471
- HomeFeedScreen.tsx:5477
- CreateScreen.tsx:6623
- ProfileScreen.tsx:3165
- ProfileScreen.tsx:3166
- ProfileScreen.tsx:3171
- IdentityScreen.tsx:790
- IdentityScreen.tsx:989
- components/MentionInput.tsx:129

#### `#1A1A2E` — 1 occurrence(s)
- IdentityScreen.tsx:952

#### `#1E1E1E` — 6 occurrence(s)
- HomeFeedScreen.tsx:5468
- HomeFeedScreen.tsx:5470
- HomeFeedScreen.tsx:5476
- HomeFeedScreen.tsx:5480
- HomeFeedScreen.tsx:5481
- HomeFeedScreen.tsx:5482

#### `#1ED760` — 4 occurrence(s)
- SoundDetailScreen.tsx:479
- components/MusicPicker.tsx:522
- components/MusicPicker.tsx:654
- components/MusicPicker.tsx:663

#### `#1F1F1F` — 2 occurrence(s)
- CreateScreen.tsx:6321
- components/HomePowrPreview.tsx:882

#### `#222` — 1 occurrence(s)
- components/ShareSheet.tsx:176

#### `#22C55E` — 15 occurrence(s)
- AccountScreen.tsx:145
- AnalyticsScreen.tsx:48
- HomeFeedScreen.tsx:4640
- HomeFeedScreen.tsx:4648
- HomeFeedScreen.tsx:4737
- SessionScreen.tsx:50
- SessionScreen.tsx:51
- PrivacyScreen.tsx:68
- PrivacyScreen.tsx:168
- SecurityScreen.tsx:155
- screens/ProfileDisplayScreen.tsx:280
- screens/ProfileDisplayScreen.tsx:297
- screens/TrustedDevicesScreen.tsx:225
- components/OTPVerificationModal.tsx:131
- services/creatorStatus.ts:62

#### `#22D3EE` — 2 occurrence(s)
- screens/EditTaglineScreen.tsx:15
- components/TaglineStrip.tsx:16

#### `#2563EB` — 1 occurrence(s)
- AuthScreen.tsx:1513

#### `#25D366` — 1 occurrence(s)
- components/ShareSheet.tsx:148

#### `#2A1212` — 2 occurrence(s)
- CreateScreen.tsx:5858
- CreateScreen.tsx:5891

#### `#2A2A2A` — 32 occurrence(s)
- CreateScreen.tsx:5458
- CreateScreen.tsx:5461
- CreateScreen.tsx:5464
- CreateScreen.tsx:5467
- CreateScreen.tsx:5470
- CreateScreen.tsx:5493
- CreateScreen.tsx:5506
- CreateScreen.tsx:5512
- CreateScreen.tsx:5616
- CreateScreen.tsx:5623
- CreateScreen.tsx:5638
- CreateScreen.tsx:5669
- CreateScreen.tsx:5675
- CreateScreen.tsx:5704
- CreateScreen.tsx:5766
- CreateScreen.tsx:5807
- CreateScreen.tsx:5842
- CreateScreen.tsx:5848
- CreateScreen.tsx:5854
- CreateScreen.tsx:5855
- CreateScreen.tsx:5856
- CreateScreen.tsx:5857
- CreateScreen.tsx:5879
- CreateScreen.tsx:5887
- CreateScreen.tsx:5888
- CreateScreen.tsx:5889
- CreateScreen.tsx:5890
- CreateScreen.tsx:5955
- CreateScreen.tsx:5984
- CreateScreen.tsx:6000
- CreateScreen.tsx:6536
- components/ShareSheet.tsx:153

#### `#2C2C2C` — 1 occurrence(s)
- CreateScreen.tsx:5925

#### `#2D2D2D` — 1 occurrence(s)
- CreateScreen.tsx:6343

#### `#2F2F2F` — 1 occurrence(s)
- CreateScreen.tsx:5423

#### `#34C759` — 1 occurrence(s)
- components/ShareSheet.tsx:151

#### `#38BDF8` — 1 occurrence(s)
- services/creatorStatus.ts:73

#### `#4ADE80` — 3 occurrence(s)
- AuthScreen.tsx:1387
- screens/EditTaglineScreen.tsx:16
- components/TaglineStrip.tsx:17

#### `#4CAF50` — 2 occurrence(s)
- CreateScreen.tsx:6799
- CreateScreen.tsx:6868

#### `#4FC3F7` — 16 occurrence(s)
- HomeFeedScreen.tsx:4671
- HomeFeedScreen.tsx:5496
- ChatScreen.tsx:1433
- ProfileScreen.tsx:2656
- ExploreScreen.tsx:1084
- IdentityScreen.tsx:814
- VerificationScreen.tsx:59
- PostDetailScreen.tsx:1133
- screens/AccountTypeScreen.tsx:53
- screens/DropComposerScreen.tsx:51
- components/VerifiedBadge.tsx:20
- components/CreatePickerSheet.tsx:18
- components/HomePostPreview.tsx:60
- components/HomePostPreview.tsx:915
- components/HomePostPreview.tsx:1535
- components/AccountTypePicker.tsx:42

#### `#59606B` — 1 occurrence(s)
- App.tsx:2239

#### `#5B2424` — 2 occurrence(s)
- CreateScreen.tsx:5858
- CreateScreen.tsx:5891

#### `#60A5FA` — 2 occurrence(s)
- AuthScreen.tsx:1558
- lib/parseBioMentions.tsx:33

#### `#6D6D6D` — 1 occurrence(s)
- components/HomePowrPreview.tsx:719

#### `#7BDFF2` — 1 occurrence(s)
- CreateScreen.tsx:5720

#### `#7C3AED` — 3 occurrence(s)
- ProfileScreen.tsx:2910
- ProfileScreen.tsx:3638
- PostDetailScreen.tsx:1185

#### `#888` — 2 occurrence(s)
- CreateScreen.tsx:7111
- PostDetailScreen.tsx:1176

#### `#8B5CF6` — 2 occurrence(s)
- ProfileScreen.tsx:3523
- ProfileScreen.tsx:3524

#### `#8F96A3` — 1 occurrence(s)
- App.tsx:2211

#### `#A1A1AA` — 3 occurrence(s)
- screens/EditTaglineScreen.tsx:17
- components/TaglineStrip.tsx:18
- services/creatorStatus.ts:83

#### `#A855F7` — 6 occurrence(s)
- AuthScreen.tsx:355
- AuthScreen.tsx:420
- AuthScreen.tsx:513
- AuthScreen.tsx:630
- AuthScreen.tsx:667
- ProfileScreen.tsx:3121

#### `#C084FC` — 3 occurrence(s)
- AuthScreen.tsx:220
- AuthScreen.tsx:724
- AuthScreen.tsx:1379

#### `#C4B5FD` — 2 occurrence(s)
- AuthScreen.tsx:688
- AuthScreen.tsx:1396

#### `#C6FF6C` — 1 occurrence(s)
- CreateScreen.tsx:5720

#### `#CF65E7` — 3 occurrence(s)
- AuthScreen.tsx:61
- AuthScreen.tsx:341
- AuthScreen.tsx:1570

#### `#D1D5DB` — 1 occurrence(s)
- App.tsx:2214

#### `#D946EF` — 3 occurrence(s)
- AuthScreen.tsx:187
- screens/EditTaglineScreen.tsx:14
- components/TaglineStrip.tsx:15

#### `#E1306C` — 1 occurrence(s)
- components/ShareSheet.tsx:147

#### `#E6D4FF` — 1 occurrence(s)
- CreateScreen.tsx:5720

#### `#E9D5FF` — 1 occurrence(s)
- AuthScreen.tsx:480

#### `#EC4899` — 3 occurrence(s)
- AuthScreen.tsx:406
- AuthScreen.tsx:499
- AuthScreen.tsx:653

#### `#EF4444` — 21 occurrence(s)
- AccountScreen.tsx:33
- AccountScreen.tsx:34
- AnalyticsScreen.tsx:49
- HomeFeedScreen.tsx:5619
- HomeFeedScreen.tsx:5625
- SessionScreen.tsx:91
- SessionScreen.tsx:92
- CreateScreen.tsx:4935
- CreateScreen.tsx:5646
- ProfileScreen.tsx:3508
- ProfileScreen.tsx:3605
- ProfileScreen.tsx:3686
- ProfileScreen.tsx:3691
- SecurityScreen.tsx:217
- VerificationScreen.tsx:60
- PostDetailScreen.tsx:1148
- screens/AccountTypeScreen.tsx:335
- screens/TrustedDevicesScreen.tsx:300
- screens/DropComposerScreen.tsx:52
- screens/DropComposerScreen.tsx:53
- components/AccountTypeConfirmModal.tsx:103

#### `#F59E0B` — 2 occurrence(s)
- VerificationScreen.tsx:61
- services/creatorStatus.ts:51

#### `#F8D652` — 1 occurrence(s)
- CreateScreen.tsx:5720

#### `#F8FAFC` — 1 occurrence(s)
- App.tsx:2253

#### `#FB7185` — 1 occurrence(s)
- AuthScreen.tsx:1390

#### `#FBBF24` — 1 occurrence(s)
- AuthScreen.tsx:1393

#### `#FCA5A5` — 1 occurrence(s)
- EditProfileScreen.tsx:145

#### `#FDA4AF` — 5 occurrence(s)
- AuthScreen.tsx:158
- AuthScreen.tsx:571
- AuthScreen.tsx:708
- AuthScreen.tsx:1399
- AuthScreen.tsx:1500

#### `#FF2D96` — 1 occurrence(s)
- components/LyricStrip.tsx:11

#### `#FF4D6D` — 4 occurrence(s)
- PostDetailScreen.tsx:1051
- PostDetailScreen.tsx:1052
- components/HomePostPreview.tsx:1737
- components/HomePostPreview.tsx:1738

#### `#FF5A5F` — 1 occurrence(s)
- components/StoryViewer.tsx:404

#### `#FF8A65` — 1 occurrence(s)
- CreateScreen.tsx:5720

#### `#FF8F8F` — 2 occurrence(s)
- components/MusicPicker.tsx:392
- components/MusicPicker.tsx:400

#### `#FFB3B3` — 1 occurrence(s)
- components/MusicPicker.tsx:660

#### `#FFB8B8` — 2 occurrence(s)
- CreateScreen.tsx:5858
- CreateScreen.tsx:5891

#### `#FFF` — 565 occurrence(s)
- AccountScreen.tsx:34
- AccountScreen.tsx:110
- AccountScreen.tsx:118
- AccountScreen.tsx:125
- AccountScreen.tsx:125
- AccountScreen.tsx:142
- AccountScreen.tsx:163
- App.tsx:239
- App.tsx:1174
- App.tsx:2119
- App.tsx:2271
- App.tsx:2342
- App.tsx:2357
- App.tsx:2367
- App.tsx:2376
- SoundPageScreen.tsx:418
- SoundPageScreen.tsx:453
- SoundPageScreen.tsx:471
- SoundPageScreen.tsx:485
- SoundPageScreen.tsx:508
- SoundPageScreen.tsx:529
- SoundPageScreen.tsx:540
- SoundPageScreen.tsx:545
- MessagesScreen.tsx:93
- MessagesScreen.tsx:95
- MessagesScreen.tsx:112
- MessagesScreen.tsx:120
- MessagesScreen.tsx:127
- MessagesScreen.tsx:160
- MessagesScreen.tsx:166
- MessagesScreen.tsx:202
- SoundDetailScreen.tsx:373
- SoundDetailScreen.tsx:382
- SoundDetailScreen.tsx:384
- SoundDetailScreen.tsx:400
- SoundDetailScreen.tsx:405
- SoundDetailScreen.tsx:407
- SoundDetailScreen.tsx:424
- SoundDetailScreen.tsx:428
- SoundDetailScreen.tsx:456
- SoundDetailScreen.tsx:526
- SoundDetailScreen.tsx:553
- SoundDetailScreen.tsx:561
- SoundDetailScreen.tsx:615
- SoundDetailScreen.tsx:618
- SoundDetailScreen.tsx:645
- AnalyticsScreen.tsx:90
- AnalyticsScreen.tsx:290
- AnalyticsScreen.tsx:306
- AnalyticsScreen.tsx:328
- AnalyticsScreen.tsx:349
- AnalyticsScreen.tsx:368
- AnalyticsScreen.tsx:404
- AnalyticsScreen.tsx:423
- AnalyticsScreen.tsx:446
- AnalyticsScreen.tsx:454
- AuthScreen.tsx:80
- AuthScreen.tsx:101
- AuthScreen.tsx:197
- AuthScreen.tsx:202
- AuthScreen.tsx:344
- AuthScreen.tsx:370
- AuthScreen.tsx:424
- AuthScreen.tsx:430
- AuthScreen.tsx:517
- AuthScreen.tsx:531
- AuthScreen.tsx:533
- AuthScreen.tsx:597
- AuthScreen.tsx:672
- AuthScreen.tsx:674
- AuthScreen.tsx:1375
- AuthScreen.tsx:1474
- AuthScreen.tsx:1489
- AuthScreen.tsx:1521
- AuthScreen.tsx:1523
- AuthScreen.tsx:1545
- AuthScreen.tsx:1547
- AuthScreen.tsx:1571
- SoundChartScreen.tsx:100
- SoundChartScreen.tsx:103
- SoundChartScreen.tsx:129
- SoundChartScreen.tsx:162
- SoundChartScreen.tsx:164
- NotificationsScreen.tsx:107
- NotificationsScreen.tsx:114
- NotificationsScreen.tsx:130
- NotificationsScreen.tsx:132
- NotificationsScreen.tsx:138
- NotificationsScreen.tsx:145
- HomeFeedScreen.tsx:661
- HomeFeedScreen.tsx:788
- HomeFeedScreen.tsx:804
- HomeFeedScreen.tsx:817
- HomeFeedScreen.tsx:822
- HomeFeedScreen.tsx:4624
- HomeFeedScreen.tsx:4667
- HomeFeedScreen.tsx:4696
- HomeFeedScreen.tsx:4751
- HomeFeedScreen.tsx:4771
- HomeFeedScreen.tsx:4936
- HomeFeedScreen.tsx:4966
- HomeFeedScreen.tsx:5023
- HomeFeedScreen.tsx:5024
- HomeFeedScreen.tsx:5061
- HomeFeedScreen.tsx:5082
- HomeFeedScreen.tsx:5114
- HomeFeedScreen.tsx:5117
- HomeFeedScreen.tsx:5126
- HomeFeedScreen.tsx:5135
- HomeFeedScreen.tsx:5145
- HomeFeedScreen.tsx:5173
- HomeFeedScreen.tsx:5208
- HomeFeedScreen.tsx:5227
- HomeFeedScreen.tsx:5234
- HomeFeedScreen.tsx:5307
- HomeFeedScreen.tsx:5371
- HomeFeedScreen.tsx:5433
- HomeFeedScreen.tsx:5549
- HomeFeedScreen.tsx:5550
- HomeFeedScreen.tsx:5569
- HomeFeedScreen.tsx:5608
- HomeFeedScreen.tsx:5616
- HomeFeedScreen.tsx:5628
- HomeFeedScreen.tsx:5631
- HomeFeedScreen.tsx:5634
- HomeFeedScreen.tsx:5671
- HomeFeedScreen.tsx:5686
- HomeFeedScreen.tsx:5693
- HomeFeedScreen.tsx:5700
- HomeFeedScreen.tsx:5707
- HomeFeedScreen.tsx:5715
- ActivityScreen.tsx:58
- ActivityScreen.tsx:69
- ActivityScreen.tsx:83
- ChatScreen.tsx:1193
- ChatScreen.tsx:1277
- ChatScreen.tsx:1278
- ChatScreen.tsx:1301
- ChatScreen.tsx:1304
- ChatScreen.tsx:1333
- ChatScreen.tsx:1338
- ChatScreen.tsx:1340
- ChatScreen.tsx:1359
- ChatScreen.tsx:1371
- ChatScreen.tsx:1401
- ChatScreen.tsx:1423
- ChatScreen.tsx:1429
- ChatScreen.tsx:1468
- ChatScreen.tsx:1527
- ChatScreen.tsx:1597
- ChatScreen.tsx:1607
- ChatScreen.tsx:1626
- ChatScreen.tsx:1628
- ChatScreen.tsx:1640
- ChatScreen.tsx:1648
- ChatScreen.tsx:1721
- ChatScreen.tsx:1732
- ChatScreen.tsx:1754
- ChatScreen.tsx:1758
- ChatScreen.tsx:1775
- SessionScreen.tsx:49
- SessionScreen.tsx:73
- CreateScreen.tsx:4132
- CreateScreen.tsx:4258
- CreateScreen.tsx:4275
- CreateScreen.tsx:4324
- CreateScreen.tsx:4361
- CreateScreen.tsx:4419
- CreateScreen.tsx:4478
- CreateScreen.tsx:4508
- CreateScreen.tsx:4510
- CreateScreen.tsx:4524
- CreateScreen.tsx:4535
- CreateScreen.tsx:4542
- CreateScreen.tsx:4553
- CreateScreen.tsx:4604
- CreateScreen.tsx:4612
- CreateScreen.tsx:4699
- CreateScreen.tsx:4718
- CreateScreen.tsx:4781
- CreateScreen.tsx:4806
- CreateScreen.tsx:4829
- CreateScreen.tsx:4849
- CreateScreen.tsx:4889
- CreateScreen.tsx:4891
- CreateScreen.tsx:4963
- CreateScreen.tsx:4984
- CreateScreen.tsx:5135
- CreateScreen.tsx:5188
- CreateScreen.tsx:5260
- CreateScreen.tsx:5282
- CreateScreen.tsx:5336
- CreateScreen.tsx:5354
- CreateScreen.tsx:5412
- CreateScreen.tsx:5431
- CreateScreen.tsx:5441
- CreateScreen.tsx:5451
- CreateScreen.tsx:5459
- CreateScreen.tsx:5462
- CreateScreen.tsx:5465
- CreateScreen.tsx:5468
- CreateScreen.tsx:5471
- CreateScreen.tsx:5491
- CreateScreen.tsx:5493
- CreateScreen.tsx:5496
- CreateScreen.tsx:5506
- CreateScreen.tsx:5506
- CreateScreen.tsx:5508
- CreateScreen.tsx:5512
- CreateScreen.tsx:5512
- CreateScreen.tsx:5514
- CreateScreen.tsx:5539
- CreateScreen.tsx:5555
- CreateScreen.tsx:5579
- CreateScreen.tsx:5594
- CreateScreen.tsx:5609
- CreateScreen.tsx:5616
- CreateScreen.tsx:5616
- CreateScreen.tsx:5618
- CreateScreen.tsx:5625
- CreateScreen.tsx:5631
- CreateScreen.tsx:5640
- CreateScreen.tsx:5647
- CreateScreen.tsx:5650
- CreateScreen.tsx:5671
- CreateScreen.tsx:5677
- CreateScreen.tsx:5702
- CreateScreen.tsx:5704
- CreateScreen.tsx:5707
- CreateScreen.tsx:5734
- CreateScreen.tsx:5768
- CreateScreen.tsx:5773
- CreateScreen.tsx:5789
- CreateScreen.tsx:5816
- CreateScreen.tsx:5833
- CreateScreen.tsx:5842
- CreateScreen.tsx:5842
- CreateScreen.tsx:5844
- CreateScreen.tsx:5848
- CreateScreen.tsx:5848
- CreateScreen.tsx:5850
- CreateScreen.tsx:5854
- CreateScreen.tsx:5855
- CreateScreen.tsx:5856
- CreateScreen.tsx:5857
- CreateScreen.tsx:5887
- CreateScreen.tsx:5888
- CreateScreen.tsx:5889
- CreateScreen.tsx:5890
- CreateScreen.tsx:5907
- CreateScreen.tsx:5984
- CreateScreen.tsx:5984
- CreateScreen.tsx:5986
- CreateScreen.tsx:6000
- CreateScreen.tsx:6000
- CreateScreen.tsx:6002
- CreateScreen.tsx:6139
- CreateScreen.tsx:6147
- CreateScreen.tsx:6163
- CreateScreen.tsx:6212
- CreateScreen.tsx:6214
- CreateScreen.tsx:6229
- CreateScreen.tsx:6238
- CreateScreen.tsx:6245
- CreateScreen.tsx:6289
- CreateScreen.tsx:6365
- CreateScreen.tsx:6376
- CreateScreen.tsx:6387
- CreateScreen.tsx:6542
- CreateScreen.tsx:6625
- CreateScreen.tsx:6634
- CreateScreen.tsx:6649
- CreateScreen.tsx:6669
- CreateScreen.tsx:6683
- CreateScreen.tsx:6700
- CreateScreen.tsx:6748
- CreateScreen.tsx:6750
- CreateScreen.tsx:6760
- CreateScreen.tsx:6768
- CreateScreen.tsx:6775
- CreateScreen.tsx:6797
- CreateScreen.tsx:6807
- CreateScreen.tsx:6819
- CreateScreen.tsx:6821
- CreateScreen.tsx:6836
- CreateScreen.tsx:6840
- CreateScreen.tsx:6864
- CreateScreen.tsx:6934
- CreateScreen.tsx:6936
- CreateScreen.tsx:6987
- CreateScreen.tsx:6989
- CreateScreen.tsx:7027
- CreateScreen.tsx:7085
- CreateScreen.tsx:7108
- CreateScreen.tsx:7115
- CreateScreen.tsx:7131
- CreateScreen.tsx:7181
- CreateScreen.tsx:7251
- CreateScreen.tsx:7259
- CreateScreen.tsx:7293
- CreateScreen.tsx:7294
- ProfileScreen.tsx:2211
- ProfileScreen.tsx:2375
- ProfileScreen.tsx:2399
- ProfileScreen.tsx:2652
- ProfileScreen.tsx:2765
- ProfileScreen.tsx:2785
- ProfileScreen.tsx:2918
- ProfileScreen.tsx:2920
- ProfileScreen.tsx:2942
- ProfileScreen.tsx:2964
- ProfileScreen.tsx:2986
- ProfileScreen.tsx:3126
- ProfileScreen.tsx:3217
- ProfileScreen.tsx:3244
- ProfileScreen.tsx:3245
- ProfileScreen.tsx:3282
- ProfileScreen.tsx:3419
- ProfileScreen.tsx:3433
- ProfileScreen.tsx:3450
- ProfileScreen.tsx:3464
- ProfileScreen.tsx:3467
- ProfileScreen.tsx:3508
- ProfileScreen.tsx:3515
- ProfileScreen.tsx:3523
- ProfileScreen.tsx:3524
- ProfileScreen.tsx:3536
- ProfileScreen.tsx:3537
- ProfileScreen.tsx:3565
- ProfileScreen.tsx:3566
- ProfileScreen.tsx:3567
- ProfileScreen.tsx:3570
- ProfileScreen.tsx:3589
- ProfileScreen.tsx:3627
- ProfileScreen.tsx:3643
- ProfileScreen.tsx:3669
- ProfileScreen.tsx:3677
- ProfileScreen.tsx:3680
- ProfileScreen.tsx:3683
- ProfileScreen.tsx:3723
- ProfileScreen.tsx:3738
- ProfileScreen.tsx:3745
- ProfileScreen.tsx:3752
- ProfileScreen.tsx:3759
- ProfileScreen.tsx:3767
- FollowListScreen.tsx:73
- FollowListScreen.tsx:98
- PrivacyScreen.tsx:48
- PrivacyScreen.tsx:69
- PrivacyScreen.tsx:120
- PrivacyScreen.tsx:167
- EditProfileScreen.tsx:108
- EditProfileScreen.tsx:137
- EditProfileScreen.tsx:177
- EditProfileScreen.tsx:179
- SettingsScreen.tsx:68
- SettingsScreen.tsx:70
- SettingsScreen.tsx:90
- SettingsScreen.tsx:132
- SettingsScreen.tsx:133
- SettingsScreen.tsx:163
- SettingsScreen.tsx:203
- ExploreScreen.tsx:987
- ExploreScreen.tsx:1000
- ExploreScreen.tsx:1010
- ExploreScreen.tsx:1031
- ExploreScreen.tsx:1032
- ExploreScreen.tsx:1043
- ExploreScreen.tsx:1046
- ExploreScreen.tsx:1073
- ExploreScreen.tsx:1080
- ExploreScreen.tsx:1096
- ExploreScreen.tsx:1130
- ExploreScreen.tsx:1137
- ExploreScreen.tsx:1174
- ExploreScreen.tsx:1178
- ExploreScreen.tsx:1192
- ExploreScreen.tsx:1265
- ExploreScreen.tsx:1310
- ExploreScreen.tsx:1318
- SecurityScreen.tsx:148
- SecurityScreen.tsx:154
- SecurityScreen.tsx:155
- SecurityScreen.tsx:180
- SecurityScreen.tsx:197
- SecurityScreen.tsx:215
- SecurityScreen.tsx:237
- SecurityScreen.tsx:239
- AboutScreen.tsx:10
- IdentityScreen.tsx:807
- IdentityScreen.tsx:813
- IdentityScreen.tsx:830
- IdentityScreen.tsx:835
- IdentityScreen.tsx:842
- IdentityScreen.tsx:849
- IdentityScreen.tsx:963
- IdentityScreen.tsx:1000
- IdentityScreen.tsx:1067
- IdentityScreen.tsx:1075
- VerificationScreen.tsx:57
- VerificationScreen.tsx:380
- VerificationScreen.tsx:535
- VerificationScreen.tsx:727
- PostDetailScreen.tsx:703
- PostDetailScreen.tsx:917
- PostDetailScreen.tsx:937
- PostDetailScreen.tsx:947
- PostDetailScreen.tsx:949
- PostDetailScreen.tsx:979
- PostDetailScreen.tsx:982
- PostDetailScreen.tsx:997
- PostDetailScreen.tsx:1039
- PostDetailScreen.tsx:1051
- PostDetailScreen.tsx:1052
- PostDetailScreen.tsx:1058
- PostDetailScreen.tsx:1059
- PostDetailScreen.tsx:1065
- PostDetailScreen.tsx:1066
- PostDetailScreen.tsx:1072
- PostDetailScreen.tsx:1073
- PostDetailScreen.tsx:1101
- PostDetailScreen.tsx:1129
- PostDetailScreen.tsx:1136
- PostDetailScreen.tsx:1170
- PostDetailScreen.tsx:1190
- app/globals.css:12
- screens/EditTaglineScreen.tsx:133
- screens/EditTaglineScreen.tsx:135
- screens/EditTaglineScreen.tsx:137
- screens/EditTaglineScreen.tsx:147
- screens/EditTaglineScreen.tsx:151
- screens/EditTaglineScreen.tsx:167
- screens/EditTaglineScreen.tsx:177
- screens/EditTaglineScreen.tsx:196
- screens/EditTaglineScreen.tsx:202
- screens/EditTaglineScreen.tsx:216
- screens/EditTaglineScreen.tsx:232
- screens/ProfileDisplayScreen.tsx:27
- screens/ProfileDisplayScreen.tsx:152
- screens/ProfileDisplayScreen.tsx:281
- screens/ProfileDisplayScreen.tsx:298
- screens/ProfileDisplayScreen.tsx:317
- screens/ProfileDisplayScreen.tsx:342
- screens/AccountTypeScreen.tsx:51
- screens/AccountTypeScreen.tsx:288
- screens/AccountTypeScreen.tsx:457
- screens/AccountTypeScreen.tsx:485
- screens/TrustedDevicesScreen.tsx:184
- screens/TrustedDevicesScreen.tsx:203
- screens/TrustedDevicesScreen.tsx:249
- screens/TrustedDevicesScreen.tsx:264
- screens/DropComposerScreen.tsx:49
- screens/DropComposerScreen.tsx:496
- components/AlignmentCard.tsx:42
- components/AlignmentCard.tsx:49
- components/SoundMomentsStrip.tsx:111
- components/SoundMomentsStrip.tsx:168
- components/MusicPicker.tsx:278
- components/MusicPicker.tsx:299
- components/MusicPicker.tsx:314
- components/MusicPicker.tsx:339
- components/MusicPicker.tsx:360
- components/MusicPicker.tsx:365
- components/MusicPicker.tsx:385
- components/MusicPicker.tsx:439
- components/MusicPicker.tsx:460
- components/MusicPicker.tsx:465
- components/MusicPicker.tsx:478
- components/MusicPicker.tsx:503
- components/MusicPicker.tsx:533
- components/MusicPicker.tsx:577
- components/MusicPicker.tsx:580
- components/MusicPicker.tsx:657
- components/MusicPicker.tsx:682
- components/MusicPicker.tsx:694
- components/MusicPicker.tsx:711
- components/MusicPicker.tsx:724
- components/MusicPicker.tsx:769
- components/MusicPicker.tsx:772
- components/UserIdentityRow.tsx:64
- components/StoryViewer.tsx:328
- components/StoryViewer.tsx:352
- components/StoryViewer.tsx:355
- components/StoryViewer.tsx:365
- components/StoryViewer.tsx:370
- components/StoryBar.tsx:46
- components/StoryBar.tsx:71
- components/CreatePickerSheet.tsx:16
- components/HomePostPreview.tsx:282
- components/HomePostPreview.tsx:635
- components/HomePostPreview.tsx:1031
- components/HomePostPreview.tsx:1033
- components/HomePostPreview.tsx:1036
- components/HomePostPreview.tsx:1043
- components/HomePostPreview.tsx:1078
- components/HomePostPreview.tsx:1141
- components/HomePostPreview.tsx:1147
- components/HomePostPreview.tsx:1178
- components/HomePostPreview.tsx:1209
- components/HomePostPreview.tsx:1210
- components/HomePostPreview.tsx:1213
- components/HomePostPreview.tsx:1524
- components/HomePostPreview.tsx:1531
- components/HomePostPreview.tsx:1580
- components/HomePostPreview.tsx:1707
- components/HomePostPreview.tsx:1728
- components/HomePostPreview.tsx:1737
- components/HomePostPreview.tsx:1738
- components/HomePostPreview.tsx:1746
- components/HomePostPreview.tsx:1747
- components/HomePostPreview.tsx:1755
- components/HomePostPreview.tsx:1756
- components/HomePostPreview.tsx:1763
- components/HomePostPreview.tsx:1764
- components/VoiceStrip.tsx:11
- components/IdentityMomentsWrapper.tsx:43
- components/IdentityMomentsWrapper.tsx:110
- components/IdentityMomentsStrip.tsx:220
- components/IdentityMomentsStrip.tsx:250
- components/IdentityMomentsStrip.tsx:259
- components/CarouselMedia.tsx:76
- components/ExploreReelCard.tsx:224
- components/ExploreReelCard.tsx:248
- components/GifPicker.tsx:119
- components/GifPicker.tsx:177
- components/ShareSheet.tsx:198
- components/ShareSheet.tsx:210
- components/ShareSheet.tsx:217
- components/ShareSheet.tsx:251
- components/ShareSheet.tsx:264
- components/ShareSheet.tsx:276
- components/ShareSheet.tsx:283
- components/PowrIdentityStreamRow.tsx:79
- components/HomePowrPreview.tsx:732
- components/HomePowrPreview.tsx:820
- components/HomePowrPreview.tsx:891
- components/HomePowrPreview.tsx:918
- components/AccountTypePicker.tsx:39
- components/AccountTypePicker.tsx:232
- components/AccountTypePicker.tsx:247
- components/HomeNowFeedCard.tsx:268
- components/HomeNowFeedCard.tsx:292
- components/SoundMomentsWrapper.tsx:52
- components/HomePowerThoughtCard.tsx:75
- components/AddAccountModal.tsx:106
- components/AddAccountModal.tsx:123
- components/AddAccountModal.tsx:141
- components/AddAccountModal.tsx:155
- components/AddAccountModal.tsx:167
- components/AddAccountModal.tsx:182
- components/AddAccountModal.tsx:183
- components/OTPVerificationModal.tsx:110
- components/OTPVerificationModal.tsx:113
- components/OTPVerificationModal.tsx:128
- components/OTPVerificationModal.tsx:153
- components/OTPVerificationModal.tsx:155
- components/MusicPill.tsx:123
- components/MentionInput.tsx:115
- components/MentionInput.tsx:174
- components/AccountTypeConfirmModal.tsx:35
- components/AccountTypeConfirmModal.tsx:57
- components/AccountTypeConfirmModal.tsx:74
- components/AccountTypeConfirmModal.tsx:103
- components/VoicePill.tsx:90
- lib/exploreHeaderUi.ts:6

#### `#FFFC00` — 1 occurrence(s)
- components/ShareSheet.tsx:149

#### `#FFFFFF` — 5 occurrence(s)
- CreateScreen.tsx:2050
- CreateScreen.tsx:3998
- CreateScreen.tsx:5720
- components/MusicPill.tsx:55
- components/VoicePill.tsx:82

# RGBA/RGB INVENTORY
Total rgba/rgb occurrences: 1067. Unique strings: 163.

#### `rgba(0,0,0,0)` — 1 occurrence(s)
- components/ExploreReelCard.tsx:230

#### `rgba(0,0,0,0.15)` — 1 occurrence(s)
- components/SoundMomentsWrapper.tsx:68

#### `rgba(0,0,0,0.2)` — 1 occurrence(s)
- components/IdentityMomentsWrapper.tsx:95

#### `rgba(0,0,0,0.22)` — 2 occurrence(s)
- ProfileScreen.tsx:3445
- components/HomeNowFeedCard.tsx:263

#### `rgba(0,0,0,0.34)` — 3 occurrence(s)
- CreateScreen.tsx:4253
- CreateScreen.tsx:4270
- components/ExploreReelCard.tsx:230

#### `rgba(0,0,0,0.35)` — 5 occurrence(s)
- ChatScreen.tsx:1274
- screens/DropComposerScreen.tsx:783
- components/SoundMomentsStrip.tsx:149
- components/MusicPill.tsx:103
- components/VoicePill.tsx:66

#### `rgba(0,0,0,0.36)` — 1 occurrence(s)
- components/UserIdentityRow.tsx:52

#### `rgba(0,0,0,0.4)` — 1 occurrence(s)
- CreateScreen.tsx:5170

#### `rgba(0,0,0,0.42)` — 2 occurrence(s)
- PostDetailScreen.tsx:700
- components/ExploreReelCard.tsx:219

#### `rgba(0,0,0,0.44)` — 3 occurrence(s)
- CreateScreen.tsx:4881
- CreateScreen.tsx:4977
- CreateScreen.tsx:6137

#### `rgba(0,0,0,0.45)` — 6 occurrence(s)
- screens/ProfileDisplayScreen.tsx:312
- screens/AccountTypeScreen.tsx:480
- components/SoundMomentsStrip.tsx:163
- components/HomePostPreview.tsx:1058
- components/HomePostPreview.tsx:1604
- components/HomePostPreview.tsx:1676

#### `rgba(0,0,0,0.5)` — 3 occurrence(s)
- CreateScreen.tsx:5183
- IdentityScreen.tsx:999
- PostDetailScreen.tsx:916

#### `rgba(0,0,0,0.52)` — 2 occurrence(s)
- HomeFeedScreen.tsx:5592
- HomeFeedScreen.tsx:5654

#### `rgba(0,0,0,0.54)` — 1 occurrence(s)
- CreateScreen.tsx:4297

#### `rgba(0,0,0,0.55)` — 6 occurrence(s)
- HomeFeedScreen.tsx:665
- HomeFeedScreen.tsx:4776
- ProfileScreen.tsx:2780
- ProfileScreen.tsx:3654
- ProfileScreen.tsx:3707
- components/MusicPicker.tsx:259

#### `rgba(0,0,0,0.58)` — 1 occurrence(s)
- CreateScreen.tsx:7276

#### `rgba(0,0,0,0.6)` — 3 occurrence(s)
- HomeFeedScreen.tsx:4709
- components/HomePostPreview.tsx:1699
- components/ShareSheet.tsx:160

#### `rgba(0,0,0,0.62)` — 1 occurrence(s)
- components/GifPicker.tsx:77

#### `rgba(0,0,0,0.68)` — 1 occurrence(s)
- CreateScreen.tsx:4185

#### `rgba(0,0,0,0.7)` — 2 occurrence(s)
- CreateScreen.tsx:7245
- components/AccountTypeConfirmModal.tsx:18

#### `rgba(0,0,0,0.72)` — 1 occurrence(s)
- CreateScreen.tsx:6509

#### `rgba(0,0,0,0.82)` — 1 occurrence(s)
- CreateScreen.tsx:4122

#### `rgba(0,0,0,0.88)` — 2 occurrence(s)
- App.tsx:2175
- App.tsx:2272

#### `rgba(0,0,0,0.92)` — 1 occurrence(s)
- CreateScreen.tsx:6712

#### `rgba(0,0,0,0.95)` — 1 occurrence(s)
- CreateScreen.tsx:4185

#### `rgba(0,120,255,1)` — 1 occurrence(s)
- components/HomePostPreview.tsx:302

#### `rgba(0,180,120,0.04)` — 1 occurrence(s)
- IdentityScreen.tsx:770

#### `rgba(0,200,150,0.09)` — 1 occurrence(s)
- IdentityScreen.tsx:914

#### `rgba(0,200,150,0.2)` — 1 occurrence(s)
- IdentityScreen.tsx:914

#### `rgba(10,10,10,0.82)` — 2 occurrence(s)
- HomeFeedScreen.tsx:5051
- ProfileScreen.tsx:3207

#### `rgba(10,10,10,0.97)` — 1 occurrence(s)
- ProfileScreen.tsx:3556

#### `rgba(10,10,10,0.98)` — 2 occurrence(s)
- HomeFeedScreen.tsx:5560
- PostDetailScreen.tsx:1087

#### `rgba(100,220,185,0.95)` — 1 occurrence(s)
- IdentityScreen.tsx:914

#### `rgba(100,230,150,0.95)` — 1 occurrence(s)
- IdentityScreen.tsx:916

#### `rgba(117,255,163,0.95)` — 1 occurrence(s)
- components/HomePowrPreview.tsx:940

#### `rgba(12,12,12,0.92)` — 1 occurrence(s)
- App.tsx:2142

#### `rgba(12,12,12,0.96)` — 1 occurrence(s)
- components/StoryViewer.tsx:380

#### `rgba(12,12,12,0.98)` — 1 occurrence(s)
- CreateScreen.tsx:6259

#### `rgba(120,40,200,0.08)` — 1 occurrence(s)
- IdentityScreen.tsx:768

#### `rgba(138,43,226,0.06)` — 2 occurrence(s)
- IdentityScreen.tsx:862
- IdentityScreen.tsx:1041

#### `rgba(138,43,226,0.1)` — 3 occurrence(s)
- IdentityScreen.tsx:885
- IdentityScreen.tsx:893
- IdentityScreen.tsx:899

#### `rgba(138,43,226,0.12)` — 1 occurrence(s)
- IdentityScreen.tsx:912

#### `rgba(138,43,226,0.18)` — 1 occurrence(s)
- IdentityScreen.tsx:1041

#### `rgba(138,43,226,0.2)` — 2 occurrence(s)
- IdentityScreen.tsx:864
- IdentityScreen.tsx:873

#### `rgba(138,43,226,0.25)` — 1 occurrence(s)
- IdentityScreen.tsx:912

#### `rgba(138,43,226,0.3)` — 1 occurrence(s)
- IdentityScreen.tsx:875

#### `rgba(138,43,226,0.4)` — 1 occurrence(s)
- IdentityScreen.tsx:1053

#### `rgba(138,43,226,0.7)` — 1 occurrence(s)
- IdentityScreen.tsx:1052

#### `rgba(192,132,252,0.9)` — 1 occurrence(s)
- AuthScreen.tsx:1373

#### `rgba(20,20,20,0.9)` — 4 occurrence(s)
- App.tsx:2114
- VerificationScreen.tsx:722
- screens/ProfileDisplayScreen.tsx:337
- screens/AccountTypeScreen.tsx:452

#### `rgba(20,20,20,0.94)` — 1 occurrence(s)
- HomeFeedScreen.tsx:5074

#### `rgba(20,24,32,0.24)` — 1 occurrence(s)
- CreateScreen.tsx:2018

#### `rgba(200,160,255,0.4)` — 2 occurrence(s)
- IdentityScreen.tsx:1044
- IdentityScreen.tsx:1048

#### `rgba(200,160,255,0.45)` — 3 occurrence(s)
- IdentityScreen.tsx:891
- IdentityScreen.tsx:897
- IdentityScreen.tsx:901

#### `rgba(200,160,255,0.5)` — 1 occurrence(s)
- IdentityScreen.tsx:870

#### `rgba(200,160,255,0.9)` — 2 occurrence(s)
- IdentityScreen.tsx:881
- IdentityScreen.tsx:1045

#### `rgba(200,160,255,0.95)` — 4 occurrence(s)
- IdentityScreen.tsx:886
- IdentityScreen.tsx:894
- IdentityScreen.tsx:900
- IdentityScreen.tsx:912

#### `rgba(220,38,38,0.48)` — 1 occurrence(s)
- EditProfileScreen.tsx:144

#### `rgba(220,60,100,0.06)` — 1 occurrence(s)
- IdentityScreen.tsx:769

#### `rgba(239,68,68,0.08)` — 1 occurrence(s)
- screens/TrustedDevicesScreen.tsx:297

#### `rgba(239,68,68,0.12)` — 1 occurrence(s)
- screens/AccountTypeScreen.tsx:334

#### `rgba(239,68,68,0.22)` — 2 occurrence(s)
- SoundPageScreen.tsx:480
- CreateScreen.tsx:7176

#### `rgba(239,68,68,0.35)` — 1 occurrence(s)
- screens/TrustedDevicesScreen.tsx:296

#### `rgba(239,68,68,0.45)` — 1 occurrence(s)
- SoundPageScreen.tsx:482

#### `rgba(239,68,68,0.55)` — 1 occurrence(s)
- CreateScreen.tsx:7178

#### `rgba(239,68,68,0.9)` — 1 occurrence(s)
- screens/TrustedDevicesScreen.tsx:237

#### `rgba(255, 45, 150, 0.22)` — 2 occurrence(s)
- components/LyricStrip.tsx:80
- components/LyricStrip.tsx:94

#### `rgba(255,0,80,1)` — 1 occurrence(s)
- components/HomePostPreview.tsx:304

#### `rgba(255,128,48,0.18)` — 1 occurrence(s)
- CreateScreen.tsx:2024

#### `rgba(255,140,0,0.1)` — 1 occurrence(s)
- IdentityScreen.tsx:913

#### `rgba(255,140,0,0.22)` — 1 occurrence(s)
- IdentityScreen.tsx:913

#### `rgba(255,140,0,1)` — 1 occurrence(s)
- components/HomePostPreview.tsx:298

#### `rgba(255,150,170,0.95)` — 1 occurrence(s)
- IdentityScreen.tsx:915

#### `rgba(255,200,120,0.95)` — 1 occurrence(s)
- IdentityScreen.tsx:913

#### `rgba(255,255,255,0.02)` — 1 occurrence(s)
- ProfileScreen.tsx:2395

#### `rgba(255,255,255,0.022)` — 1 occurrence(s)
- ProfileScreen.tsx:107

#### `rgba(255,255,255,0.025)` — 5 occurrence(s)
- AnalyticsScreen.tsx:301
- AnalyticsScreen.tsx:323
- AnalyticsScreen.tsx:344
- AnalyticsScreen.tsx:364
- AnalyticsScreen.tsx:400

#### `rgba(255,255,255,0.03)` — 32 occurrence(s)
- AccountScreen.tsx:31
- SoundDetailScreen.tsx:597
- AnalyticsScreen.tsx:83
- AnalyticsScreen.tsx:418
- ActivityScreen.tsx:82
- SessionScreen.tsx:44
- SessionScreen.tsx:69
- SessionScreen.tsx:89
- ProfileScreen.tsx:2371
- PrivacyScreen.tsx:43
- PrivacyScreen.tsx:165
- SecurityScreen.tsx:146
- SecurityScreen.tsx:173
- SecurityScreen.tsx:232
- AboutScreen.tsx:8
- IdentityScreen.tsx:907
- IdentityScreen.tsx:931
- IdentityScreen.tsx:1011
- VerificationScreen.tsx:55
- PostDetailScreen.tsx:1120
- screens/EditTaglineScreen.tsx:166
- screens/EditTaglineScreen.tsx:191
- screens/EditTaglineScreen.tsx:215
- screens/EditTaglineScreen.tsx:231
- screens/ProfileDisplayScreen.tsx:25
- screens/AccountTypeScreen.tsx:49
- screens/DropComposerScreen.tsx:47
- components/MusicPicker.tsx:379
- components/CreatePickerSheet.tsx:14
- components/TaglineStrip.tsx:75
- components/LyricStrip.tsx:58
- components/AccountTypePicker.tsx:37

#### `rgba(255,255,255,0.04)` — 15 occurrence(s)
- AccountScreen.tsx:103
- SoundPageScreen.tsx:387
- SoundDetailScreen.tsx:491
- AuthScreen.tsx:477
- SoundChartScreen.tsx:115
- CreateScreen.tsx:4594
- FollowListScreen.tsx:95
- components/MusicPicker.tsx:291
- components/MusicPicker.tsx:307
- components/MusicPicker.tsx:425
- components/MusicPicker.tsx:557
- components/MusicPicker.tsx:677
- components/MusicPicker.tsx:693
- components/MusicPicker.tsx:710
- components/MusicPicker.tsx:750

#### `rgba(255,255,255,0.05)` — 9 occurrence(s)
- ActivityScreen.tsx:67
- CreateScreen.tsx:6927
- SecurityScreen.tsx:204
- IdentityScreen.tsx:1084
- screens/ProfileDisplayScreen.tsx:29
- components/MusicPicker.tsx:326
- components/MusicPicker.tsx:354
- components/OTPVerificationModal.tsx:146
- components/MusicPill.tsx:104

#### `rgba(255,255,255,0.055)` — 1 occurrence(s)
- ProfileScreen.tsx:106

#### `rgba(255,255,255,0.06)` — 31 occurrence(s)
- AccountScreen.tsx:177
- SoundPageScreen.tsx:389
- MessagesScreen.tsx:142
- NotificationsScreen.tsx:83
- HomeFeedScreen.tsx:5201
- ChatScreen.tsx:1483
- ChatScreen.tsx:1498
- ChatScreen.tsx:1521
- ChatScreen.tsx:1544
- ChatScreen.tsx:1584
- ChatScreen.tsx:1728
- CreateScreen.tsx:4350
- CreateScreen.tsx:4411
- CreateScreen.tsx:4596
- CreateScreen.tsx:5534
- CreateScreen.tsx:7121
- ProfileScreen.tsx:2394
- ProfileScreen.tsx:2938
- SecurityScreen.tsx:190
- IdentityScreen.tsx:776
- IdentityScreen.tsx:1020
- components/SoundMomentsStrip.tsx:129
- components/HomePostPreview.tsx:1203
- components/IdentityMomentsWrapper.tsx:107
- components/TaglineStrip.tsx:74
- components/ShareSheet.tsx:280
- components/LyricStrip.tsx:57
- components/AddAccountModal.tsx:116
- components/AddAccountModal.tsx:133
- components/AddAccountModal.tsx:146
- components/AddAccountModal.tsx:159

#### `rgba(255,255,255,0.07)` — 5 occurrence(s)
- IdentityScreen.tsx:773
- IdentityScreen.tsx:779
- IdentityScreen.tsx:907
- IdentityScreen.tsx:931
- IdentityScreen.tsx:1011

#### `rgba(255,255,255,0.08)` — 136 occurrence(s)
- AccountScreen.tsx:31
- AccountScreen.tsx:92
- AccountScreen.tsx:98
- AccountScreen.tsx:103
- AccountScreen.tsx:131
- AccountScreen.tsx:133
- AccountScreen.tsx:153
- AccountScreen.tsx:185
- App.tsx:237
- App.tsx:2344
- MessagesScreen.tsx:108
- SoundDetailScreen.tsx:419
- SoundDetailScreen.tsx:521
- AnalyticsScreen.tsx:82
- AnalyticsScreen.tsx:300
- AnalyticsScreen.tsx:322
- AnalyticsScreen.tsx:343
- AnalyticsScreen.tsx:363
- AnalyticsScreen.tsx:399
- AuthScreen.tsx:76
- AuthScreen.tsx:97
- AuthScreen.tsx:588
- AuthScreen.tsx:1371
- AuthScreen.tsx:1485
- SoundChartScreen.tsx:158
- HomeFeedScreen.tsx:817
- HomeFeedScreen.tsx:5302
- HomeFeedScreen.tsx:5367
- HomeFeedScreen.tsx:5428
- HomeFeedScreen.tsx:5604
- HomeFeedScreen.tsx:5615
- HomeFeedScreen.tsx:5618
- HomeFeedScreen.tsx:5624
- HomeFeedScreen.tsx:5627
- HomeFeedScreen.tsx:5630
- HomeFeedScreen.tsx:5633
- HomeFeedScreen.tsx:5642
- HomeFeedScreen.tsx:5666
- ActivityScreen.tsx:67
- ActivityScreen.tsx:78
- ActivityScreen.tsx:82
- ChatScreen.tsx:1182
- ChatScreen.tsx:1250
- ChatScreen.tsx:1383
- ChatScreen.tsx:1567
- SessionScreen.tsx:44
- SessionScreen.tsx:64
- SessionScreen.tsx:69
- SessionScreen.tsx:86
- CreateScreen.tsx:4307
- CreateScreen.tsx:4352
- CreateScreen.tsx:4413
- CreateScreen.tsx:4455
- CreateScreen.tsx:5205
- CreateScreen.tsx:5680
- CreateScreen.tsx:5681
- CreateScreen.tsx:5779
- CreateScreen.tsx:6261
- CreateScreen.tsx:6612
- CreateScreen.tsx:6752
- CreateScreen.tsx:6828
- CreateScreen.tsx:6929
- CreateScreen.tsx:7105
- CreateScreen.tsx:7176
- CreateScreen.tsx:7287
- ProfileScreen.tsx:2370
- ProfileScreen.tsx:2840
- ProfileScreen.tsx:2861
- ProfileScreen.tsx:2886
- ProfileScreen.tsx:2955
- ProfileScreen.tsx:2977
- ProfileScreen.tsx:3106
- ProfileScreen.tsx:3665
- ProfileScreen.tsx:3676
- ProfileScreen.tsx:3679
- ProfileScreen.tsx:3682
- ProfileScreen.tsx:3685
- ProfileScreen.tsx:3690
- ProfileScreen.tsx:3695
- ProfileScreen.tsx:3718
- PrivacyScreen.tsx:42
- PrivacyScreen.tsx:128
- PrivacyScreen.tsx:150
- PrivacyScreen.tsx:160
- PrivacyScreen.tsx:165
- SettingsScreen.tsx:83
- SettingsScreen.tsx:86
- ExploreScreen.tsx:1113
- ExploreScreen.tsx:1241
- SecurityScreen.tsx:145
- SecurityScreen.tsx:172
- SecurityScreen.tsx:176
- SecurityScreen.tsx:209
- SecurityScreen.tsx:228
- SecurityScreen.tsx:232
- SecurityScreen.tsx:238
- AboutScreen.tsx:8
- AboutScreen.tsx:23
- AboutScreen.tsx:31
- IdentityScreen.tsx:733
- IdentityScreen.tsx:989
- IdentityScreen.tsx:1067
- VerificationScreen.tsx:54
- VerificationScreen.tsx:56
- PostDetailScreen.tsx:675
- PostDetailScreen.tsx:1093
- PostDetailScreen.tsx:1119
- PostDetailScreen.tsx:1168
- screens/EditTaglineScreen.tsx:129
- screens/ProfileDisplayScreen.tsx:26
- screens/AccountTypeScreen.tsx:48
- screens/AccountTypeScreen.tsx:50
- screens/TrustedDevicesScreen.tsx:171
- screens/TrustedDevicesScreen.tsx:284
- screens/DropComposerScreen.tsx:46
- screens/DropComposerScreen.tsx:48
- components/AlignmentCard.tsx:25
- components/MusicPicker.tsx:268
- components/MusicPicker.tsx:496
- components/MusicPicker.tsx:556
- components/MusicPicker.tsx:676
- components/MusicPicker.tsx:749
- components/CreatePickerSheet.tsx:15
- components/HomePostPreview.tsx:844
- components/HomePostPreview.tsx:1124
- components/GifPicker.tsx:120
- components/GifPicker.tsx:173
- components/GifPicker.tsx:212
- components/ShareSheet.tsx:268
- components/ShareSheet.tsx:273
- components/AccountTypePicker.tsx:38
- components/HomeNowFeedCard.tsx:138
- components/MentionInput.tsx:154
- components/AccountTypeConfirmModal.tsx:29
- components/AccountTypeConfirmModal.tsx:52
- lib/exploreHeaderUi.ts:16

#### `rgba(255,255,255,0.09)` — 1 occurrence(s)
- ExploreScreen.tsx:1259

#### `rgba(255,255,255,0.1)` — 62 occurrence(s)
- AccountScreen.tsx:110
- AccountScreen.tsx:118
- AccountScreen.tsx:137
- AccountScreen.tsx:158
- MessagesScreen.tsx:150
- SoundDetailScreen.tsx:594
- AnalyticsScreen.tsx:416
- NotificationsScreen.tsx:96
- HomeFeedScreen.tsx:798
- HomeFeedScreen.tsx:811
- HomeFeedScreen.tsx:5203
- HomeFeedScreen.tsx:5567
- ChatScreen.tsx:1413
- ChatScreen.tsx:1500
- ChatScreen.tsx:1523
- ChatScreen.tsx:1546
- ChatScreen.tsx:1753
- CreateScreen.tsx:4383
- CreateScreen.tsx:4594
- CreateScreen.tsx:5592
- CreateScreen.tsx:6565
- CreateScreen.tsx:6746
- CreateScreen.tsx:6767
- CreateScreen.tsx:6794
- CreateScreen.tsx:6817
- CreateScreen.tsx:6883
- ProfileScreen.tsx:3625
- EditProfileScreen.tsx:93
- EditProfileScreen.tsx:127
- EditProfileScreen.tsx:132
- EditProfileScreen.tsx:153
- ExploreScreen.tsx:1122
- ExploreScreen.tsx:1169
- ExploreScreen.tsx:1307
- SecurityScreen.tsx:204
- SecurityScreen.tsx:213
- SecurityScreen.tsx:235
- AboutScreen.tsx:38
- IdentityScreen.tsx:776
- IdentityScreen.tsx:833
- IdentityScreen.tsx:840
- IdentityScreen.tsx:847
- IdentityScreen.tsx:1086
- VerificationScreen.tsx:534
- screens/EditTaglineScreen.tsx:165
- screens/EditTaglineScreen.tsx:214
- screens/EditTaglineScreen.tsx:230
- components/MusicPicker.tsx:293
- components/MusicPicker.tsx:309
- components/MusicPicker.tsx:325
- components/MusicPicker.tsx:424
- components/MusicPicker.tsx:457
- components/MusicPicker.tsx:692
- components/MusicPicker.tsx:709
- components/IdentityMomentsStrip.tsx:243
- components/ShareSheet.tsx:253
- components/AccountTypePicker.tsx:247
- components/AddAccountModal.tsx:133
- components/AddAccountModal.tsx:146
- components/AddAccountModal.tsx:159
- components/MusicPill.tsx:115
- components/MentionInput.tsx:165

#### `rgba(255,255,255,0.12)` — 46 occurrence(s)
- AccountScreen.tsx:123
- SoundPageScreen.tsx:467
- SoundPageScreen.tsx:528
- MessagesScreen.tsx:199
- SoundDetailScreen.tsx:490
- SoundDetailScreen.tsx:547
- AuthScreen.tsx:193
- AuthScreen.tsx:355
- AuthScreen.tsx:1373
- SoundChartScreen.tsx:114
- CreateScreen.tsx:4127
- CreateScreen.tsx:4255
- CreateScreen.tsx:4272
- CreateScreen.tsx:4883
- CreateScreen.tsx:4979
- CreateScreen.tsx:5536
- CreateScreen.tsx:6303
- CreateScreen.tsx:6639
- CreateScreen.tsx:6660
- CreateScreen.tsx:6674
- CreateScreen.tsx:6690
- CreateScreen.tsx:6927
- ProfileScreen.tsx:2842
- ProfileScreen.tsx:2863
- ProfileScreen.tsx:2888
- FollowListScreen.tsx:91
- ExploreScreen.tsx:1068
- screens/DropComposerScreen.tsx:588
- screens/DropComposerScreen.tsx:728
- components/AlignmentCard.tsx:37
- components/MusicPicker.tsx:291
- components/MusicPicker.tsx:307
- components/MusicPicker.tsx:378
- components/MusicPicker.tsx:571
- components/MusicPicker.tsx:763
- components/UserIdentityRow.tsx:53
- components/StoryBar.tsx:40
- components/StoryBar.tsx:61
- components/HomePostPreview.tsx:1136
- components/HomePostPreview.tsx:1521
- components/AddAccountModal.tsx:121
- components/AddAccountModal.tsx:179
- components/OTPVerificationModal.tsx:146
- components/MusicPill.tsx:115
- components/MentionInput.tsx:133
- components/VoicePill.tsx:77

#### `rgba(255,255,255,0.14)` — 17 occurrence(s)
- SoundDetailScreen.tsx:548
- HomeFeedScreen.tsx:5053
- HomeFeedScreen.tsx:5705
- ChatScreen.tsx:1182
- CreateScreen.tsx:4385
- CreateScreen.tsx:5779
- CreateScreen.tsx:6023
- CreateScreen.tsx:6224
- CreateScreen.tsx:6537
- CreateScreen.tsx:7178
- ProfileScreen.tsx:3209
- ProfileScreen.tsx:3558
- ProfileScreen.tsx:3757
- screens/EditTaglineScreen.tsx:190
- components/ExploreReelCard.tsx:202
- components/MusicPill.tsx:99
- components/MusicPill.tsx:102

#### `rgba(255,255,255,0.15)` — 10 occurrence(s)
- CreateScreen.tsx:5207
- PrivacyScreen.tsx:68
- EditProfileScreen.tsx:174
- SecurityScreen.tsx:155
- AboutScreen.tsx:37
- IdentityScreen.tsx:1072
- screens/ProfileDisplayScreen.tsx:280
- screens/ProfileDisplayScreen.tsx:297
- components/HomePowrPreview.tsx:913
- components/AddAccountModal.tsx:179

#### `rgba(255,255,255,0.16)` — 15 occurrence(s)
- App.tsx:2144
- SoundDetailScreen.tsx:610
- AuthScreen.tsx:78
- AuthScreen.tsx:99
- AuthScreen.tsx:1487
- HomeFeedScreen.tsx:5076
- CreateScreen.tsx:4927
- CreateScreen.tsx:5606
- CreateScreen.tsx:5937
- CreateScreen.tsx:6511
- CreateScreen.tsx:7012
- CreateScreen.tsx:7070
- ProfileScreen.tsx:2743
- components/StoryViewer.tsx:382
- components/GifPicker.tsx:173

#### `rgba(255,255,255,0.18)` — 15 occurrence(s)
- App.tsx:2116
- App.tsx:2250
- AnalyticsScreen.tsx:440
- HomeFeedScreen.tsx:5201
- CreateScreen.tsx:4320
- CreateScreen.tsx:5592
- VerificationScreen.tsx:724
- PostDetailScreen.tsx:1098
- screens/ProfileDisplayScreen.tsx:339
- screens/AccountTypeScreen.tsx:454
- components/MusicPicker.tsx:353
- components/StoryViewer.tsx:344
- components/ExploreReelCard.tsx:270
- components/MusicPill.tsx:98
- components/VoicePill.tsx:65

#### `rgba(255,255,255,0.2)` — 17 occurrence(s)
- SoundDetailScreen.tsx:520
- AuthScreen.tsx:1538
- HomeFeedScreen.tsx:4616
- HomeFeedScreen.tsx:5173
- CreateScreen.tsx:4527
- CreateScreen.tsx:4935
- CreateScreen.tsx:4951
- CreateScreen.tsx:5576
- CreateScreen.tsx:7254
- EditProfileScreen.tsx:136
- VerificationScreen.tsx:482
- screens/TrustedDevicesScreen.tsx:189
- components/MusicPicker.tsx:496
- components/StoryBar.tsx:61
- components/CreatePickerSheet.tsx:90
- components/ShareSheet.tsx:243
- components/OTPVerificationModal.tsx:131

#### `rgba(255,255,255,0.22)` — 9 occurrence(s)
- App.tsx:2231
- AuthScreen.tsx:473
- CreateScreen.tsx:4953
- CreateScreen.tsx:6226
- CreateScreen.tsx:6929
- ExploreScreen.tsx:1003
- components/MusicPicker.tsx:275
- components/UserIdentityRow.tsx:62
- components/ExploreReelCard.tsx:269

#### `rgba(255,255,255,0.24)` — 5 occurrence(s)
- AuthScreen.tsx:587
- CreateScreen.tsx:4472
- CreateScreen.tsx:4596
- ProfileScreen.tsx:3147
- ExploreScreen.tsx:629

#### `rgba(255,255,255,0.25)` — 11 occurrence(s)
- AccountScreen.tsx:36
- SessionScreen.tsx:76
- CreateScreen.tsx:6623
- ProfileScreen.tsx:2912
- EditProfileScreen.tsx:99
- AboutScreen.tsx:12
- IdentityScreen.tsx:908
- IdentityScreen.tsx:933
- IdentityScreen.tsx:1013
- components/MusicPicker.tsx:724
- components/MentionInput.tsx:109

#### `rgba(255,255,255,0.28)` — 7 occurrence(s)
- App.tsx:2213
- SoundDetailScreen.tsx:547
- HomeFeedScreen.tsx:5203
- CreateScreen.tsx:5300
- CreateScreen.tsx:5734
- ExploreScreen.tsx:616
- components/StoryViewer.tsx:319

#### `rgba(255,255,255,0.3)` — 29 occurrence(s)
- AccountScreen.tsx:108
- AccountScreen.tsx:116
- AccountScreen.tsx:167
- AuthScreen.tsx:464
- HomeFeedScreen.tsx:822
- HomeFeedScreen.tsx:5491
- ActivityScreen.tsx:80
- CreateScreen.tsx:6657
- CreateScreen.tsx:6671
- CreateScreen.tsx:6687
- ProfileScreen.tsx:3126
- PrivacyScreen.tsx:16
- SettingsScreen.tsx:93
- SecurityScreen.tsx:33
- SecurityScreen.tsx:185
- SecurityScreen.tsx:196
- SecurityScreen.tsx:226
- IdentityScreen.tsx:831
- IdentityScreen.tsx:838
- IdentityScreen.tsx:845
- IdentityScreen.tsx:852
- IdentityScreen.tsx:1031
- VerificationScreen.tsx:544
- components/AccountTypePicker.tsx:41
- components/AddAccountModal.tsx:138
- components/AddAccountModal.tsx:151
- components/AddAccountModal.tsx:164
- components/OTPVerificationModal.tsx:155
- components/OTPVerificationModal.tsx:163

#### `rgba(255,255,255,0.31)` — 1 occurrence(s)
- ExploreScreen.tsx:603

#### `rgba(255,255,255,0.32)` — 2 occurrence(s)
- CreateScreen.tsx:157
- CreateScreen.tsx:4667

#### `rgba(255,255,255,0.33)` — 1 occurrence(s)
- ExploreScreen.tsx:628

#### `rgba(255,255,255,0.35)` — 34 occurrence(s)
- MessagesScreen.tsx:103
- MessagesScreen.tsx:175
- MessagesScreen.tsx:189
- MessagesScreen.tsx:212
- NotificationsScreen.tsx:151
- HomeFeedScreen.tsx:816
- HomeFeedScreen.tsx:5681
- HomeFeedScreen.tsx:5692
- HomeFeedScreen.tsx:5699
- ActivityScreen.tsx:84
- ChatScreen.tsx:1604
- ChatScreen.tsx:1726
- CreateScreen.tsx:5833
- CreateScreen.tsx:6632
- CreateScreen.tsx:6758
- CreateScreen.tsx:6834
- ProfileScreen.tsx:2945
- ProfileScreen.tsx:2967
- ProfileScreen.tsx:2989
- ProfileScreen.tsx:3250
- ProfileScreen.tsx:3733
- ProfileScreen.tsx:3744
- ProfileScreen.tsx:3751
- IdentityScreen.tsx:817
- screens/TrustedDevicesScreen.tsx:181
- screens/TrustedDevicesScreen.tsx:229
- screens/TrustedDevicesScreen.tsx:266
- components/MusicPicker.tsx:338
- components/MusicPicker.tsx:595
- components/MusicPicker.tsx:687
- components/MusicPicker.tsx:703
- components/HomePostPreview.tsx:1092
- components/IdentityMomentsWrapper.tsx:87
- components/GifPicker.tsx:228

#### `rgba(255,255,255,0.36)` — 13 occurrence(s)
- AuthScreen.tsx:67
- AuthScreen.tsx:93
- AuthScreen.tsx:373
- AuthScreen.tsx:384
- AuthScreen.tsx:433
- AuthScreen.tsx:443
- AuthScreen.tsx:537
- AuthScreen.tsx:548
- AuthScreen.tsx:559
- AuthScreen.tsx:606
- AuthScreen.tsx:1481
- ExploreScreen.tsx:615
- components/ExploreReelCard.tsx:277

#### `rgba(255,255,255,0.38)` — 5 occurrence(s)
- CreateScreen.tsx:6179
- CreateScreen.tsx:6297
- ProfileScreen.tsx:2713
- ExploreScreen.tsx:1271
- screens/TrustedDevicesScreen.tsx:207

#### `rgba(255,255,255,0.4)` — 69 occurrence(s)
- AccountScreen.tsx:20
- AccountScreen.tsx:35
- AccountScreen.tsx:143
- AccountScreen.tsx:164
- App.tsx:240
- App.tsx:2357
- App.tsx:2367
- HomeFeedScreen.tsx:801
- HomeFeedScreen.tsx:809
- HomeFeedScreen.tsx:5492
- ActivityScreen.tsx:63
- ActivityScreen.tsx:70
- ActivityScreen.tsx:76
- SessionScreen.tsx:41
- SessionScreen.tsx:53
- SessionScreen.tsx:62
- SessionScreen.tsx:74
- SessionScreen.tsx:84
- CreateScreen.tsx:4486
- CreateScreen.tsx:6753
- CreateScreen.tsx:6795
- CreateScreen.tsx:6799
- CreateScreen.tsx:6829
- ProfileScreen.tsx:2661
- PrivacyScreen.tsx:15
- PrivacyScreen.tsx:49
- PrivacyScreen.tsx:54
- EditProfileScreen.tsx:108
- EditProfileScreen.tsx:133
- EditProfileScreen.tsx:167
- SettingsScreen.tsx:91
- ExploreScreen.tsx:602
- SecurityScreen.tsx:32
- SecurityScreen.tsx:149
- SecurityScreen.tsx:181
- SecurityScreen.tsx:191
- SecurityScreen.tsx:200
- SecurityScreen.tsx:213
- SecurityScreen.tsx:224
- SecurityScreen.tsx:235
- AboutScreen.tsx:11
- AboutScreen.tsx:21
- AboutScreen.tsx:29
- IdentityScreen.tsx:777
- IdentityScreen.tsx:850
- IdentityScreen.tsx:964
- VerificationScreen.tsx:58
- screens/EditTaglineScreen.tsx:156
- screens/EditTaglineScreen.tsx:209
- screens/EditTaglineScreen.tsx:225
- screens/ProfileDisplayScreen.tsx:28
- screens/ProfileDisplayScreen.tsx:142
- screens/AccountTypeScreen.tsx:52
- screens/AccountTypeScreen.tsx:295
- screens/DropComposerScreen.tsx:50
- components/CreatePickerSheet.tsx:17
- components/HomePostPreview.tsx:1152
- components/HomePostPreview.tsx:1161
- components/HomePostPreview.tsx:1221
- components/CarouselMedia.tsx:75
- components/GifPicker.tsx:116
- components/PowrIdentityStreamRow.tsx:76
- components/AccountTypePicker.tsx:40
- components/HomePowerThoughtCard.tsx:89
- components/AddAccountModal.tsx:109
- components/AddAccountModal.tsx:123
- components/AddAccountModal.tsx:170
- components/OTPVerificationModal.tsx:161
- components/MentionInput.tsx:171

#### `rgba(255,255,255,0.42)` — 19 occurrence(s)
- App.tsx:2271
- CreateScreen.tsx:156
- CreateScreen.tsx:4358
- CreateScreen.tsx:4418
- CreateScreen.tsx:4519
- CreateScreen.tsx:4666
- CreateScreen.tsx:4953
- CreateScreen.tsx:5585
- CreateScreen.tsx:5760
- CreateScreen.tsx:5862
- CreateScreen.tsx:5894
- CreateScreen.tsx:5964
- CreateScreen.tsx:6551
- ProfileScreen.tsx:3025
- ProfileScreen.tsx:3281
- PostDetailScreen.tsx:1156
- components/MusicPicker.tsx:583
- components/HomePowrPreview.tsx:743
- components/MusicPill.tsx:97

#### `rgba(255,255,255,0.44)` — 4 occurrence(s)
- SoundPageScreen.tsx:540
- SoundPageScreen.tsx:545
- AnalyticsScreen.tsx:387
- ProfileScreen.tsx:3012

#### `rgba(255,255,255,0.45)` — 23 occurrence(s)
- AuthScreen.tsx:345
- AuthScreen.tsx:1401
- NotificationsScreen.tsx:115
- HomeFeedScreen.tsx:5228
- HomeFeedScreen.tsx:5258
- HomeFeedScreen.tsx:5325
- HomeFeedScreen.tsx:5385
- ChatScreen.tsx:1452
- ChatScreen.tsx:1506
- ChatScreen.tsx:1529
- ChatScreen.tsx:1552
- CreateScreen.tsx:6653
- CreateScreen.tsx:6865
- ProfileScreen.tsx:2804
- ProfileScreen.tsx:2815
- ProfileScreen.tsx:3619
- ExploreScreen.tsx:1048
- ExploreScreen.tsx:1098
- ExploreScreen.tsx:1139
- screens/TrustedDevicesScreen.tsx:257
- components/HomePostPreview.tsx:912
- components/HomePostPreview.tsx:1080
- components/HomePowrPreview.tsx:826

#### `rgba(255,255,255,0.46)` — 4 occurrence(s)
- CreateScreen.tsx:4364
- CreateScreen.tsx:4420
- ExploreScreen.tsx:627
- components/HomePowerThoughtCard.tsx:85

#### `rgba(255,255,255,0.48)` — 4 occurrence(s)
- AnalyticsScreen.tsx:291
- AnalyticsScreen.tsx:370
- HomeFeedScreen.tsx:5635
- components/StoryBar.tsx:75

#### `rgba(255,255,255,0.5)` — 53 occurrence(s)
- AccountScreen.tsx:33
- AccountScreen.tsx:138
- AccountScreen.tsx:159
- MessagesScreen.tsx:168
- AnalyticsScreen.tsx:91
- AuthScreen.tsx:144
- AuthScreen.tsx:573
- HomeFeedScreen.tsx:5235
- HomeFeedScreen.tsx:5309
- HomeFeedScreen.tsx:5436
- ActivityScreen.tsx:68
- ChatScreen.tsx:1575
- SessionScreen.tsx:46
- SessionScreen.tsx:71
- CreateScreen.tsx:5522
- CreateScreen.tsx:5655
- CreateScreen.tsx:5752
- CreateScreen.tsx:6536
- CreateScreen.tsx:6740
- CreateScreen.tsx:6824
- CreateScreen.tsx:7202
- ProfileScreen.tsx:2383
- ProfileScreen.tsx:3562
- ProfileScreen.tsx:3611
- FollowListScreen.tsx:76
- PrivacyScreen.tsx:175
- EditProfileScreen.tsx:94
- EditProfileScreen.tsx:154
- ExploreScreen.tsx:1039
- AboutScreen.tsx:9
- IdentityScreen.tsx:780
- IdentityScreen.tsx:1001
- IdentityScreen.tsx:1092
- PostDetailScreen.tsx:1025
- PostDetailScreen.tsx:1026
- components/MusicPicker.tsx:333
- components/HomePostPreview.tsx:1030
- components/HomePostPreview.tsx:1042
- components/HomePostPreview.tsx:1090
- components/HomePostPreview.tsx:1545
- components/HomePostPreview.tsx:1546
- components/HomePostPreview.tsx:1553
- components/HomePostPreview.tsx:1554
- components/ShareSheet.tsx:177
- components/ShareSheet.tsx:252
- components/ShareSheet.tsx:255
- components/HomePowrPreview.tsx:765
- components/HomePowrPreview.tsx:845
- components/HomePowrPreview.tsx:929
- components/SoundMomentsWrapper.tsx:72
- components/OTPVerificationModal.tsx:107
- components/OTPVerificationModal.tsx:111
- components/MentionInput.tsx:139

#### `rgba(255,255,255,0.52)` — 7 occurrence(s)
- SoundPageScreen.tsx:421
- AnalyticsScreen.tsx:315
- CreateScreen.tsx:4548
- CreateScreen.tsx:5969
- ExploreScreen.tsx:614
- components/HomePowrPreview.tsx:940
- components/MusicPill.tsx:132

#### `rgba(255,255,255,0.54)` — 3 occurrence(s)
- SoundDetailScreen.tsx:434
- CreateScreen.tsx:4605
- CreateScreen.tsx:6522

#### `rgba(255,255,255,0.55)` — 28 occurrence(s)
- MessagesScreen.tsx:185
- MessagesScreen.tsx:208
- AnalyticsScreen.tsx:50
- AnalyticsScreen.tsx:89
- AnalyticsScreen.tsx:407
- AnalyticsScreen.tsx:424
- AnalyticsScreen.tsx:468
- NotificationsScreen.tsx:148
- HomeFeedScreen.tsx:4674
- HomeFeedScreen.tsx:4974
- HomeFeedScreen.tsx:5242
- CreateScreen.tsx:5479
- CreateScreen.tsx:5502
- CreateScreen.tsx:5542
- CreateScreen.tsx:5665
- CreateScreen.tsx:5682
- CreateScreen.tsx:5902
- CreateScreen.tsx:7052
- CreateScreen.tsx:7061
- CreateScreen.tsx:7185
- ProfileScreen.tsx:2218
- ProfileScreen.tsx:3510
- ExploreScreen.tsx:994
- ExploreScreen.tsx:1088
- ExploreScreen.tsx:1181
- components/HomePostPreview.tsx:1538
- components/IdentityMomentsWrapper.tsx:99
- components/VoicePill.tsx:102

#### `rgba(255,255,255,0.56)` — 8 occurrence(s)
- SoundPageScreen.tsx:455
- SoundChartScreen.tsx:104
- SoundChartScreen.tsx:173
- HomeFeedScreen.tsx:5609
- CreateScreen.tsx:4702
- ProfileScreen.tsx:2379
- ProfileScreen.tsx:3670
- components/MusicPicker.tsx:368

#### `rgba(255,255,255,0.58)` — 8 occurrence(s)
- ChatScreen.tsx:1739
- ChatScreen.tsx:1759
- ChatScreen.tsx:1779
- ExploreScreen.tsx:601
- components/MusicPicker.tsx:581
- components/MusicPicker.tsx:658
- components/MusicPicker.tsx:773
- components/ExploreReelCard.tsx:288

#### `rgba(255,255,255,0.6)` — 21 occurrence(s)
- AccountScreen.tsx:178
- SoundDetailScreen.tsx:568
- AuthScreen.tsx:526
- AuthScreen.tsx:699
- CreateScreen.tsx:4742
- CreateScreen.tsx:5210
- CreateScreen.tsx:5411
- CreateScreen.tsx:5525
- CreateScreen.tsx:5644
- CreateScreen.tsx:5788
- CreateScreen.tsx:5922
- CreateScreen.tsx:6769
- CreateScreen.tsx:6862
- ProfileScreen.tsx:3482
- FollowListScreen.tsx:82
- EditProfileScreen.tsx:140
- PostDetailScreen.tsx:1019
- PostDetailScreen.tsx:1137
- components/MusicPicker.tsx:481
- components/AddAccountModal.tsx:102
- components/AccountTypeConfirmModal.tsx:40

#### `rgba(255,255,255,0.62)` — 22 occurrence(s)
- App.tsx:2151
- SoundPageScreen.tsx:454
- SoundPageScreen.tsx:517
- SoundPageScreen.tsx:553
- SoundPageScreen.tsx:561
- HomeFeedScreen.tsx:5208
- ChatScreen.tsx:1344
- CreateScreen.tsx:4539
- CreateScreen.tsx:4559
- CreateScreen.tsx:4564
- CreateScreen.tsx:5335
- CreateScreen.tsx:5959
- ProfileScreen.tsx:2403
- ProfileScreen.tsx:3591
- ExploreScreen.tsx:1268
- PostDetailScreen.tsx:938
- PostDetailScreen.tsx:987
- components/MusicPicker.tsx:388
- components/StoryViewer.tsx:357
- components/HomePostPreview.tsx:288
- components/ExploreReelCard.tsx:297
- components/HomePowerThoughtCard.tsx:80

#### `rgba(255,255,255,0.64)` — 2 occurrence(s)
- AnalyticsScreen.tsx:428
- CreateScreen.tsx:6354

#### `rgba(255,255,255,0.65)` — 10 occurrence(s)
- AuthScreen.tsx:630
- AuthScreen.tsx:1475
- AuthScreen.tsx:1572
- HomeFeedScreen.tsx:5168
- HomeFeedScreen.tsx:5533
- CreateScreen.tsx:6572
- FollowListScreen.tsx:71
- components/AlignmentCard.tsx:50
- components/AlignmentCard.tsx:51
- components/StoryBar.tsx:48

#### `rgba(255,255,255,0.66)` — 2 occurrence(s)
- SoundChartScreen.tsx:167
- components/MusicPicker.tsx:471

#### `rgba(255,255,255,0.68)` — 4 occurrence(s)
- SoundDetailScreen.tsx:553
- CreateScreen.tsx:7209
- ExploreScreen.tsx:626
- components/HomePowerThoughtCard.tsx:58

#### `rgba(255,255,255,0.7)` — 12 occurrence(s)
- AccountScreen.tsx:180
- SoundDetailScreen.tsx:431
- CreateScreen.tsx:4174
- CreateScreen.tsx:4219
- CreateScreen.tsx:4359
- ProfileScreen.tsx:2847
- ProfileScreen.tsx:2868
- ProfileScreen.tsx:2893
- ProfileScreen.tsx:3597
- ExploreScreen.tsx:1127
- IdentityScreen.tsx:774
- components/OTPVerificationModal.tsx:163

#### `rgba(255,255,255,0.72)` — 13 occurrence(s)
- AnalyticsScreen.tsx:286
- AnalyticsScreen.tsx:287
- HomeFeedScreen.tsx:5571
- HomeFeedScreen.tsx:5643
- HomeFeedScreen.tsx:5673
- ProfileScreen.tsx:96
- ProfileScreen.tsx:3696
- ProfileScreen.tsx:3725
- PostDetailScreen.tsx:1103
- PostDetailScreen.tsx:1141
- components/SoundMomentsStrip.tsx:136
- components/HomePowrPreview.tsx:737
- components/MusicPill.tsx:126

#### `rgba(255,255,255,0.74)` — 2 occurrence(s)
- ProfileScreen.tsx:108
- ExploreScreen.tsx:613

#### `rgba(255,255,255,0.75)` — 1 occurrence(s)
- ProfileScreen.tsx:3605

#### `rgba(255,255,255,0.76)` — 1 occurrence(s)
- ProfileScreen.tsx:3572

#### `rgba(255,255,255,0.78)` — 8 occurrence(s)
- AuthScreen.tsx:632
- CreateScreen.tsx:5927
- CreateScreen.tsx:5956
- CreateScreen.tsx:7213
- ProfileScreen.tsx:3283
- PostDetailScreen.tsx:1148
- components/MusicPicker.tsx:280
- components/ExploreReelCard.tsx:201

#### `rgba(255,255,255,0.8)` — 8 occurrence(s)
- CreateScreen.tsx:6647
- CreateScreen.tsx:6668
- CreateScreen.tsx:6682
- SettingsScreen.tsx:87
- ExploreScreen.tsx:600
- SecurityScreen.tsx:177
- IdentityScreen.tsx:740
- PostDetailScreen.tsx:983

#### `rgba(255,255,255,0.82)` — 8 occurrence(s)
- CreateScreen.tsx:4399
- CreateScreen.tsx:5061
- CreateScreen.tsx:5078
- CreateScreen.tsx:5284
- components/SoundMomentsStrip.tsx:174
- components/StoryBar.tsx:75
- components/HomeNowFeedCard.tsx:281
- components/MusicPill.tsx:66

#### `rgba(255,255,255,0.84)` — 1 occurrence(s)
- ExploreScreen.tsx:625

#### `rgba(255,255,255,0.85)` — 2 occurrence(s)
- HomeFeedScreen.tsx:805
- HomeFeedScreen.tsx:4737

#### `rgba(255,255,255,0.86)` — 4 occurrence(s)
- SoundDetailScreen.tsx:496
- CreateScreen.tsx:4478
- CreateScreen.tsx:6516
- ProfileScreen.tsx:2376

#### `rgba(255,255,255,0.88)` — 4 occurrence(s)
- SoundChartScreen.tsx:170
- CreateScreen.tsx:4470
- ProfileScreen.tsx:3475
- components/HomePowerThoughtCard.tsx:64

#### `rgba(255,255,255,0.9)` — 15 occurrence(s)
- SoundPageScreen.tsx:447
- SoundChartScreen.tsx:121
- CreateScreen.tsx:5175
- CreateScreen.tsx:6978
- ProfileScreen.tsx:2848
- ProfileScreen.tsx:2869
- ProfileScreen.tsx:2894
- ProfileScreen.tsx:3293
- ExploreScreen.tsx:612
- ExploreScreen.tsx:1262
- components/SoundMomentsStrip.tsx:152
- components/HomePostPreview.tsx:1607
- components/HomePostPreview.tsx:1679
- components/ExploreReelCard.tsx:280
- components/HomePowrPreview.tsx:806

#### `rgba(255,255,255,0.92)` — 8 occurrence(s)
- App.tsx:2147
- CreateScreen.tsx:4391
- CreateScreen.tsx:4497
- CreateScreen.tsx:4775
- CreateScreen.tsx:4800
- CreateScreen.tsx:4825
- CreateScreen.tsx:4844
- CreateScreen.tsx:5781

#### `rgba(255,255,255,0.99)` — 1 occurrence(s)
- ExploreScreen.tsx:599

#### `rgba(255,60,100,0.09)` — 1 occurrence(s)
- IdentityScreen.tsx:915

#### `rgba(255,60,100,0.2)` — 1 occurrence(s)
- IdentityScreen.tsx:915

#### `rgba(30,215,96,0.06)` — 2 occurrence(s)
- IdentityScreen.tsx:950
- components/MusicPicker.tsx:634

#### `rgba(30,215,96,0.08)` — 1 occurrence(s)
- IdentityScreen.tsx:916

#### `rgba(30,215,96,0.15)` — 2 occurrence(s)
- IdentityScreen.tsx:950
- components/MusicPicker.tsx:648

#### `rgba(30,215,96,0.18)` — 1 occurrence(s)
- IdentityScreen.tsx:916

#### `rgba(30,215,96,0.25)` — 1 occurrence(s)
- components/MusicPicker.tsx:633

#### `rgba(30,215,96,0.28)` — 1 occurrence(s)
- components/MusicPicker.tsx:516

#### `rgba(30,215,96,0.4)` — 1 occurrence(s)
- SoundDetailScreen.tsx:474

#### `rgba(30,215,96,0.7)` — 1 occurrence(s)
- IdentityScreen.tsx:968

#### `rgba(34,197,94,0.09)` — 1 occurrence(s)
- components/MusicPicker.tsx:425

#### `rgba(34,197,94,0.15)` — 1 occurrence(s)
- screens/TrustedDevicesScreen.tsx:220

#### `rgba(34,197,94,0.35)` — 1 occurrence(s)
- screens/TrustedDevicesScreen.tsx:222

#### `rgba(34,197,94,0.45)` — 1 occurrence(s)
- components/MusicPicker.tsx:424

#### `rgba(34,197,94,0.95)` — 1 occurrence(s)
- components/MusicPicker.tsx:468

#### `rgba(34,211,238,0.95)` — 1 occurrence(s)
- components/HomeNowFeedCard.tsx:138

#### `rgba(56,189,248,0.25)` — 1 occurrence(s)
- AnalyticsScreen.tsx:384

#### `rgba(56,189,248,0.7)` — 1 occurrence(s)
- AnalyticsScreen.tsx:382

#### `rgba(76,132,255,0.2)` — 1 occurrence(s)
- CreateScreen.tsx:2027

#### `rgba(79,195,247,0.05)` — 1 occurrence(s)
- components/AccountTypePicker.tsx:164

#### `rgba(79,195,247,0.1)` — 1 occurrence(s)
- screens/AccountTypeScreen.tsx:352

#### `rgba(79,195,247,0.12)` — 5 occurrence(s)
- screens/AccountTypeScreen.tsx:329
- screens/AccountTypeScreen.tsx:411
- screens/AccountTypeScreen.tsx:425
- components/AccountTypePicker.tsx:172
- components/AccountTypePicker.tsx:177

#### `rgba(79,195,247,0.15)` — 1 occurrence(s)
- components/CreatePickerSheet.tsx:136

#### `rgba(79,195,247,0.3)` — 1 occurrence(s)
- screens/AccountTypeScreen.tsx:354

#### `rgba(80,0,120,1)` — 1 occurrence(s)
- components/HomePostPreview.tsx:300

#### `rgba(84,84,84,0.38)` — 1 occurrence(s)
- CreateScreen.tsx:2021

#### `rgba(90,16,16,0.55)` — 1 occurrence(s)
- EditProfileScreen.tsx:144

---

## 2. Typography System

### 2.1 Font loading

- **No `expo-font` / `useFonts` usage found** in the audited `.tsx`/`.ts` tree — typography relies on **React Native system default** (San Francisco on iOS, Roboto on Android).

### 2.2 Web (`app/globals.css`) utility classes

| Class | Rules |
|-------|--------|
| `.text-title` | `font-size: 18px` |
| `.text-username` | `font-size: 14px` |
| `.text-caption` | `font-size: 13px` |
| `.text-meta` | `font-size: 11px`, `opacity: 0.65` |

### 2.3 Native patterns (semantic grouping)

**Display / hero**

- Identity hero username: large weight (see `IdentityScreen` header block).
- Profile username: prominent, with verification badge alongside (`ProfileScreen` + `VerifiedBadge`).

**Titles**

- Screen titles (Settings stack): `fontSize: 17`, `fontWeight: '700'`, `#fff` (`SettingsNavigator` `headerTitleStyle`).
- Section titles (e.g. Schedule, Review in Drop composer): `fontSize: 22`, `fontWeight: '700'`.

**Body**

- Settings hub row title: `fontSize: 15`, `fontWeight: '500'`, `#fff`.
- Settings subtitle: `fontSize: 12`, `rgba(255,255,255,0.4)`.

**Caption / meta**

- Identity stat labels (LIFTS, SCROLL BACKS, ECHOES, ALIGNED): `fontSize: 9`, `letterSpacing: 1.5`, `color: rgba(255,255,255,0.3)`.
- Section caps (e.g. LIFTED POSTS): `fontSize: 9`, `letterSpacing: 2.5`, muted purple tint for alignment header.

**Buttons**

- Primary CTA (e.g. Schedule Drop): `fontSize: 17`, `fontWeight: '800'`.
- Tab bar labels: `fontSize: 11`, `fontWeight: '600'` active / `'500'` inactive (`App.tsx` `renderNavItem`).

**Stats**

- Identity numeric stats: paired with §2.3 caption labels above.

**Verification / status**

- Verification uses `ACCENT`, `DESTRUCTIVE`, `PENDING_AMBER` for status-dependent messaging.

**Brand**

- No separate wordmark font family in code; brand is color + copy driven.

---

## 3. Navigation & Tab Bar

### 3.1 Visual — bottom tab bar

| Property | Value / behavior |
|----------|------------------|
| Height | `TAB_BAR_OVERLAY_INSET_BOTTOM` = **82** (`lib/tabBarOverlayInset.ts`), matching `height: 72 + NAV_BOTTOM_SPACE (10)` in comment |
| Background | `rgba(0,0,0,0.88)` |
| Border | `borderWidth: 1`, `borderColor: rgba(255,255,255,0.08)`, top corners `22` radius |
| Horizontal padding | `16` |
| Bottom padding | `NAV_BOTTOM_SPACE` = `10` |
| Safe area | Tab is `position: 'absolute'` bottom; content uses `TAB_BAR_OVERLAY_INSET_BOTTOM` in feeds to avoid overlap |
| Icons | **Ionicons** (`@expo/vector-icons`), size **24** for tabs |
| Tab labels | Home / Now / Explore / You — `fontSize: 11`, active `#fff`, inactive `COLOR_TEXT_MUTED` |
| Active indicator | Dot `4x4`, `#fff` below label when active |
| Center control | Not a tab index — opens `CreatePickerSheet` (Phase 3.1) |

### 3.2 Structural graph

**Root (`App.tsx`)**

- **Tabs (state `tab`):** `home` | `now` | `create` | `explore` | `profile`
- **Lazy mount:** `mountedTabs` gates first paint per tab.
- **Overlays (absolute, various z-index):** Analytics, Follow list, Edit tagline, Identity (other user), Sound page, Sound chart, Sound detail, Notifications, Messages/Chat, Post detail, Create picker, Drop composer, toasts, return signals.
- **Modals:** `AddAccountModal`, OTP modal (`OTPVerificationModal`), story/chat flows inside feature screens.

**Profile stack (`navigation/ProfileStackNavigator.tsx`)**

- Native stack: `ProfileMain`, `PostDetail`, `Identity` (params: `targetUserId`), nested profile opens.
- Animation: default native stack (slide).

**Settings stack (`SettingsScreen.tsx` / `SettingsNavigator`)**

- Hub + screens: Account, AccountType, ProfileDisplay, EditProfile, Privacy, Activity, Security, Verification, About, Session, TrustedDevices (imported).
- `animation: 'slide_from_right'`, black headers.

**Web routes (`app/` — Next-style)**

- Separate web surfaces exist (`app/page.tsx`, `app/explore/page.tsx`, etc.) — parallel to native, not identical to tab state.

### 3.3 Params & deep links

- **Web:** `window.history` sync for `/create` and sound paths (`App.tsx`).
- **Profile stack:** `profileUserId`, `initialTab` (`posts` | `powr` | `likes`), `powrScrollToPostId` from home POWR chip.

---

## 4. Identity Page (full spec)

**File:** `IdentityScreen.tsx`

### 4.1 Concept

- **Identity** = relationship / alignment view between **viewer** (`viewerUserId`) and **target** (`targetUserId`). Not the same as **Profile** (full creator hub with tabs, settings, grid).

### 4.2 Layout

- Full-screen scroll, hero with avatar, username, verification flag, alignment label.
- **LinearGradient** fade treatment at bottom of hero/content (see file).
- **Stats row** (four columns): labels **LIFTS**, **SCROLL BACKS**, **ECHOES**, **ALIGNED** — `fontSize: 9`, uppercase tracking.

### 4.3 Creator signal / alignment

- **Alignment score** computed client-side (`computeAlignmentScore`, `computeAlignmentLabel`) from overlapping artists + activity between viewer and target posts.
- **Creator signal / insights** panels use derived strings (and **fallback mock content** when data thin — see `FALLBACK_*` constants).

### 4.4 Data shown

- Header: username, avatar, `verified`, `alignmentLabel`.
- Music lists, lifted content, repeated listens — mix of **real post-derived** rows and **fallback** placeholders when empty.

### 4.5 Interactions

- **Back** → `onBack`.
- **View Profile** → `onViewProfile(targetUserId)` (switches to profile stack).
- **Open post** → `onOpenPost`.
- **Open sound** → `onOpenSound` with payload (licensed vs user).

### 4.6 Entry points

- Explore → identity (`handleExploreOpenIdentity` pattern in `App.tsx`).
- Notifications → profile or identity depending on target.
- Post detail → identity for non-mutual paths.
- Messages/chat → peer profile routing.

---

## 5. Profile Page (full spec)

**File:** `ProfileScreen.tsx` (~3.8k lines — authoritative for layout).

### 5.1 Header

- Avatar: outer **90**, inner **84**, radii **45 / 42**, ring implied by nested sizes.
- Top bar: icon size **22**, color `rgba(255,255,255,0.72)`, gap **6**, side width **112** for title centering.
- Username + **`VerifiedBadge`** (`components/VerifiedBadge.tsx`).
- **TaglineStrip** / bio via `BioText` / `parseBioMentions`.

### 5.2 Actions (summary)

- Own vs other governs **Edit**, **Follow**, **Message**, **Tune In** (where implemented), analytics entry, identity entry, settings gear.
- **Account type** drives business/media contact chips and category chip.

### 5.3 Current Sound / music

- **MusicPill**, **MusicPicker** integration for posting; profile surfaces **current sound** via posts / resolver — exact “Unstoppable” treatment ties to POWR + music resolver (see §15).

### 5.4 Tabs

- **Posts / POWR / Likes / Lifted** (see file for exact tab labels and grid).
- POWR tab uses vertical stream (`PowrIdentityStreamRow`, estimated row height constants).
- Empty states per tab in-file.

### 5.5 Scroll / loading

- `RefreshControl`, skeletons/activity indicators per section — see implementation.

---

## 6. Account Types System

**Source:** `lib/accountTypes.ts` + UI in `screens/AccountTypeScreen.tsx`, `ProfileDisplayScreen.tsx`, `ProfileScreen.tsx`, onboarding.

### 6.1 Tiers

| Type | Internal id | Notes |
|------|-------------|--------|
| Personal | `personal` | Full music library (`canUseFullMusicLibrary`) |
| Business | `business` | Must be public (`mustBePublic`), verification required (`requiresVerification`) |
| Media | `media` | Same as business for public + verification |

### 6.2 Categories

- **Personal:** `personal`, `creator`, `artist`, `public_figure`
- **Business:** `brand`, `company`, `shop`, `restaurant`
- **Media:** `radio_station`, `magazine`, `podcast`, `publication`

Display labels: `ACCOUNT_CATEGORY_LABELS`.

### 6.3 Privacy

- **Business & Media:** `mustBePublic()` → always public-facing in product rules.
- **Personal:** can use private account (enforced in `PrivacyScreen` / DB — see app UI).

### 6.4 Music library

- **Personal:** `canUseFullMusicLibrary === true`
- **Business/Media:** **not** full library — product rule in code comments + MusicPicker behavior (commercial emphasis; confirm in `MusicPicker` / posts for enforcement).

### 6.5 Verification

- **Business/Media:** `requiresVerification`; submissions in `verification_submissions` (see §7).

### 6.6 Drops duration (product)

From `lib/drops.ts` `DROP_DURATION_RANGES`:

| Type | Min (s) | Max (s) |
|------|---------|---------|
| personal | 60 | 90 |
| business | 10 | 45 |
| media | 10 | 90 |

---

## 7. Verification System

**Sources:** `lib/verification.ts`, `VerificationScreen.tsx`, migration referenced in comments (`20260419000001_verification_system.sql`).

### 7.1 Submission model

- **Who:** Business + Media (`accountType` in submission type); personal not in V1 submission type.
- **Fields:** `legalEntityName`, optional `websiteUrl`, `userNotes`, **document** upload.
- **Bucket:** `verification-documents`, max **10 MB**, MIME allow-list in `VERIFICATION_ALLOWED_MIME_TYPES`.
- **Path:** `buildVerificationDocumentPath`.

### 7.2 Status machine

- `pending` | `approved` | `rejected` — helpers: `isVerified`, `isVerificationPending`, `canSubmitVerification` (re-submit allowed when not pending/approved).

### 7.3 UI tokens (`VerificationScreen`)

- Colors: §1.2 / §1.3.
- Image picker flow (PDF noted as needing document picker — not installed).

### 7.4 Sync / admin

- Native does not embed admin review UI; status read from DB row. **Badge sync / triggers:** described in SQL migration (not re-read in full for this doc).

---

## 8. Home / Now Feed

**File:** `HomeFeedScreen.tsx`

### 8.1 Modes

- **`feedType`:** default home vs **`now`** — Now uses focused post index, swipe-from-home behavior, video mount window (`NOW_VIDEO_MOUNT_WINDOW`).

### 8.2 Ranking / signals

- **`computePostScore`** (`services/signalScoring.ts`) + **`buildCreatorBoostByUserId`** (`lib/creatorSurfacingFromPosts.ts`): per-author sqrt cap.
- **Sound trends:** `computeSoundTrendBucketsFromPosts`, `defaultClientPostTrendScoreForSoundTrend` (`lib/soundTrendsFromPosts.ts`).
- **Viewability:** `viewabilityConfig` 70% threshold; dwell timers; scroll-back hooks (`bumpScrollBack`).

### 8.3 Cards

- **`PostItem`** → **`HomePostPreview`** pipeline for feed rows.
- **VoiceStrip**, **FeedPostMusicPlayback**, **StoryBar** + **StoryViewer** on home.

### 8.4 Actions

- Lift (`liftPost`), likes (`togglePostLike`), echo fetch/insert via `HomePostPreview`, share via `sharePost`.

### 8.5 Stories row

- **`StoryBar`** component at top (when stories exist).

---

## 9. Explore / Search / Sound Pages

### 9.1 ExploreScreen

- Discovery reels/cards (`ExploreReelCard`), trending sound logic from posts.
- Header metrics: `EXPLORE_HEADER_*` (`lib/exploreHeaderUi.ts`).

### 9.2 Search

- **`multiTypeSearch.ts`**: `searchMultiType`, grouped results (users/posts/sounds — see service).

### 9.3 Sound pages

- **`SoundPageScreen.tsx`**, **`SoundDetailScreen.tsx`**: metadata, posts using sound, **Open in Spotify** `#1ed760`.

### 9.4 Charts

- **`SoundChartScreen.tsx`**, **`services/chartAdapter.ts`**, **`components/charts/ChartItem.tsx`**.

### 9.5 Discovery strip tokens

**File:** `components/discoveryStripTokens.ts`

- `DISCOVERY_CONTAINER_MARGIN_VERTICAL = 6`
- `DISCOVERY_HORIZONTAL_PADDING = 12`
- `DISCOVERY_VERTICAL_PADDING = 4`
- `DISCOVERY_ITEM_GAP = 12`
- `DISCOVERY_FOCUS_SCALE = 1.03`
- `DISCOVERY_TILE_WIDTH = 152`

---

## 10. POWR Posts & Voice Strips

### 10.1 Detection

- **`isPowrPost`**: text-only, no media (`lib/isPowrPost.ts`).
- **`PostItem`** delegates POWR layout to **`buildPowrHomePostPreviewProps`**.

### 10.2 HomePostPreview

- Unified POWR card: lift, listen, echo thread, recording echoes, solo audio coordination (`RUEHL_FEED_SOLO_AUDIO`), ShareSheet.

### 10.3 Voice strip

- **`VoiceStrip.tsx`** — waveform/play UI (exact props in file).

### 10.4 Profile POWR stream

- **`PowrIdentityStreamRow`** etc., deep link scroll via `powrScrollToPostId`.

---

## 11. DROPS

**Sources:** `lib/drops.ts`, `screens/DropComposerScreen.tsx`, `App.tsx` wiring, SQL migration comments.

### 11.1 Model (`Drop`)

Fields: `creatorId`, `accountType`, `accountCategory`, `audioPath`, `durationSeconds`, `caption`, `scheduledFor`, `status`, `postWindowChoice`, timestamps (`createdAt`, `startedAt`, `endedAt`, `windowClosedAt`).

### 11.2 Status machine

`scheduled` → `live` → `ended` → (`posted` | `archived` | `expired`) plus product rules in `lib/drops.ts`.

### 11.3 Composer flow

1. **idle** — record CTA  
2. **recording** — pulse animation, tier max duration  
3. **review** — play preview, re-record, advance if duration valid  
4. **schedule** — datetime + caption; **schedule rules:** `isValidScheduleTime` — strictly future, max **365 days** (`DROP_SCHEDULE_MAX_LEAD_DAYS`)  
5. **success**

### 11.4 Scheduling (client)

- `DROP_SCHEDULE_MIN_LEAD_MINUTES = 0` (immediate allowed after “now”).
- **Note:** DB migration may still enforce legacy window — see §25.

### 11.5 Live window

- **`DROP_LIVE_WINDOW_MINUTES = 30`** after `scheduled_for`.

### 11.6 Tune-in / echoes / wrap-up

- Defined in SQL + `drops.ts` types (`DropTuneIn`, `DropEcho`, caps). **Native viewer surfaces for Drops shelf / countdown may be future phases** — composer exists in-app.

### 11.7 Web read-only

- Render needs: status, schedule time, audio URL (via storage path), caption, creator account snapshot fields, window timing.

---

## 12. Echoes (voice replies on posts)

**Sources:** `services/echoes.ts`, `HomePostPreview.tsx`, `services/echoPlayback.ts`

- Table: `echoes` with `post_id`, `audio_url`, profile join.
- Thread UI inside POWR card; playback id coordination.
- **Drop echoes** are separate domain (`drop_echoes` in `lib/drops.ts`).

---

## 13. Scroll Backs

- Feed ranking exposes **`bumpScrollBack`** via viewability exit (`HomeFeedScreen.tsx` engagement hooks).
- Identity stat label **SCROLL BACKS** on `IdentityScreen`.
- RPC/trigger details in DB (not expanded in this audit).

---

## 14. Lifts

**Source:** `services/lifts.ts`

- Endorsement model (not “like”) — `post_lifts` table.
- Rate limits: max **20** lifts / **60s**; cooldown **900ms** between actions on same key; **24h** active lift window constant present.
- UI purple **`#8b5cf6`** when lifted (`ProfileScreen` overlay).
- **`triggerLiftFeedback`** (`services/interactions.ts`) for haptics/animation.

---

## 15. Music / Sound Integration

- **Attach:** `attachPostMusicIdentity` (`lib/postMusicIdentity.ts`), **`resolvePostSound`** (`lib/postSoundResolver.ts`).
- **Spotify:** backend **`GET /spotify/search`** (`backend/index.js`), **`GET /music/trending`** uses Supabase licensed/catalog tables.
- **MusicPicker:** search UI, **Open in Spotify** `#1ed760`.
- **Deezer:** no active integration found in audited paths (grep not run globally — §25).

---

## 16. Messages / Chat

**Files:** `MessagesScreen.tsx`, `ChatScreen.tsx`, `services/dmSupabase.ts`, `services/messagesInbox.ts`

- Inbox list → thread with **`ChatScreen`** (`peerUserId`).
- Story capture request from chat (`App.tsx` `createCaptureSource === 'chat'`).
- GIF picker (`GifPicker.tsx`), Spotify search in chat context — see `ChatScreen.tsx` imports.

---

## 17. Settings

**Hub:** `SettingsScreen.tsx` rows (exact labels):

| Row | Subtitle |
|-----|----------|
| Edit profile | Photo, name, bio, links |
| Account | Email, password, switch accounts |
| Account type | Personal, Business, or Media |
| Privacy | Visibility, blocked users |
| Profile display | Contact info and visibility on profile |
| Activity | Your activity and history |
| Security | Two-factor authentication |
| Verification | **Get verified on Ruehl** |
| About | App info, terms, privacy |
| Session | Sign out or manage sessions |

**Trusted devices:** `screens/TrustedDevicesScreen.tsx` (stack).

---

## 18. Notifications

**File:** `NotificationsScreen.tsx` + `services/notificationsFeed.ts`

- Filter/sort persisted (`App.tsx` AsyncStorage keys).
- Unread badge count on home bell.
- Deep link handlers in `App.tsx` (`handleNotificationOpenPost`, etc.).

---

## 19. Session / Sessions

**File:** `SessionScreen.tsx`

- **Not** a live-events map — this screen is **session management**: active device, switch saved accounts, sign out (danger zone). No map affordance in audited file.

---

## 20. Stories

**Sources:** `components/StoryBar.tsx`, `StoryViewer.tsx`, `services/stories.ts`

- Video max **60s** (`STORY_VIDEO_MAX_MS`).
- Music payload rules mirror posts (`buildStoryMusicPayload`).
- 24h expiration — verify in `stories` table usage (§25 if inconsistent).

---

## 21. Onboarding / Auth

**File:** `AuthScreen.tsx` (large)

- Email/password, profile fields (name, bio), age/username flows — exact validation in file.
- **`App.tsx` OTP gate:** `OTPVerificationModal`, device trust (`lib/deviceTrust.ts`), `trusted_devices`.

---

## 22. Admin Surfaces on Native

- **No `is_admin` / admin conditional found** in audited `.tsx`/`.ts` grep.

---

## 23. Brand Voice & Microcopy Catalog (grep-extracted)

**Method:** `grep`/`re` extraction from `*.ts`/`*.tsx` under the repo root, excluding `node_modules`, `.next`, `dist`, `supabase/functions`, `tests/`, `backend/`. Patterns: `placeholder="..."`, `accessibilityLabel="..."`, and quoted strings inside `Alert.alert(...)` lines. **§23.3** adds a **manual line-level pass** for `screens/DropComposerScreen.tsx` JSX copy (the highest-visibility gap in the automated patterns). **Still not exhaustive for:** other screens’ arbitrary `<Text>` children, template literals, many `title=` props, or toast strings unless they matched patterns.

**Totals:** extracted rows ≈ `337`.

### 23.1 High-value brand strings (Lift / Echo / Ruehl / POWR flagged in extractor)

- `Lift unavailable` — `ProfileScreen` · Alert string · `ProfileScreen.tsx:2582`
- `Echo` — `components/HomePostPreview` · Alert string · `components/HomePostPreview.tsx:713`
- `Lift` — `components/HomePostPreview` · Alert string · `components/HomePostPreview.tsx:696`
- `Lift` — `components/HomePostPreview` · Alert string · `components/HomePostPreview.tsx:783`

### 23.2 All extracted strings by surface

#### `AccountScreen`
- **placeholder**: `Confirm new password`  
  `AccountScreen.tsx:115`
- **Alert string**: `Delete account`  
  `AccountScreen.tsx:186`
- **Alert string**: `Delete account`  
  `AccountScreen.tsx:186`
- **Alert string**: `Error`  
  `AccountScreen.tsx:58`
- **Alert string**: `Error`  
  `AccountScreen.tsx:62`
- **Alert string**: `Error`  
  `AccountScreen.tsx:69`
- **placeholder**: `New password`  
  `AccountScreen.tsx:107`
- **Alert string**: `OK`  
  `AccountScreen.tsx:186`
- **Alert string**: `Password must be at least 8 characters`  
  `AccountScreen.tsx:62`
- **Alert string**: `Password updated successfully`  
  `AccountScreen.tsx:71`
- **Alert string**: `Passwords do not match`  
  `AccountScreen.tsx:58`
- **Alert string**: `Remove account`  
  `AccountScreen.tsx:79`
- **Alert string**: `Remove this account from the switcher?`  
  `AccountScreen.tsx:79`
- **Alert string**: `Success`  
  `AccountScreen.tsx:71`
- **Alert string**: `This action is permanent and cannot be undone. Contact support@ruehl.app to proceed.`  
  `AccountScreen.tsx:186`
- **Alert string**: `trash-outline`  
  `AccountScreen.tsx:186`

#### `App`
- **Alert string**: `Could not switch account.`  
  `App.tsx:394`
- **Alert string**: `Could not switch account.`  
  `App.tsx:400`
- **Alert string**: `Error`  
  `App.tsx:394`
- **Alert string**: `Error`  
  `App.tsx:400`
- **Alert string**: `Please sign in to this account again.`  
  `App.tsx:378`
- **Alert string**: `Publish did not finish`  
  `App.tsx:1483`
- **Alert string**: `Session expired`  
  `App.tsx:378`

#### `AuthScreen`
- **Alert string**: `A password reset link has been sent to`  
  `AuthScreen.tsx:134`
- **placeholder**: `Bio (optional)`  
  `AuthScreen.tsx:605`
- **Alert string**: `Check your email`  
  `AuthScreen.tsx:134`
- **placeholder**: `Confirmation code`  
  `AuthScreen.tsx:1480`
- **placeholder**: `DD`  
  `AuthScreen.tsx:547`
- **placeholder**: `Email or phone`  
  `AuthScreen.tsx:372`
- **Alert string**: `Error`  
  `AuthScreen.tsx:125`
- **Alert string**: `Error`  
  `AuthScreen.tsx:132`
- **placeholder**: `Full name`  
  `AuthScreen.tsx:432`
- **placeholder**: `MM`  
  `AuthScreen.tsx:536`
- **placeholder**: `Password`  
  `AuthScreen.tsx:92`
- **placeholder**: `Password`  
  `AuthScreen.tsx:383`
- **Alert string**: `Permission needed`  
  `AuthScreen.tsx:1105`
- **Alert string**: `Please allow photo access to choose an avatar.`  
  `AuthScreen.tsx:1105`
- **Alert string**: `Please enter your email address first.`  
  `AuthScreen.tsx:125`
- **placeholder**: `Username`  
  `AuthScreen.tsx:442`
- **placeholder**: `Username, email, or mobile number`  
  `AuthScreen.tsx:66`
- **placeholder**: `YYYY`  
  `AuthScreen.tsx:558`

#### `ChatScreen`
- **Alert string**: `Check your connection and try again.`  
  `ChatScreen.tsx:757`
- **Alert string**: `Check your connection and try again.`  
  `ChatScreen.tsx:848`
- **Alert string**: `Check your connection and try again.`  
  `ChatScreen.tsx:1680`
- **Alert string**: `Could not remove this message.`  
  `ChatScreen.tsx:781`
- **Alert string**: `Delete failed`  
  `ChatScreen.tsx:781`
- **Alert string**: `Enable microphone access to send voice notes.`  
  `ChatScreen.tsx:905`
- **Alert string**: `Message not sent`  
  `ChatScreen.tsx:757`
- **Alert string**: `Message not sent`  
  `ChatScreen.tsx:848`
- **Alert string**: `Message not sent`  
  `ChatScreen.tsx:1680`
- **placeholder**: `Message…`  
  `ChatScreen.tsx:1603`
- **Alert string**: `Microphone permission needed`  
  `ChatScreen.tsx:905`
- **Alert string**: `Playback unavailable`  
  `ChatScreen.tsx:1042`
- **placeholder**: `Search tracks or artists...`  
  `ChatScreen.tsx:1725`
- **Alert string**: `Unable to play this voice note.`  
  `ChatScreen.tsx:1042`
- **Alert string**: `Unable to save recording.`  
  `ChatScreen.tsx:878`
- **Alert string**: `Unable to start recording.`  
  `ChatScreen.tsx:924`
- **Alert string**: `Voice note unavailable`  
  `ChatScreen.tsx:878`
- **Alert string**: `Voice note unavailable`  
  `ChatScreen.tsx:924`

#### `CreateScreen`
- **placeholder**: `Add a caption...`  
  `CreateScreen.tsx:5334`
- **Alert string**: `Add a photo or video first.`  
  `CreateScreen.tsx:3318`
- **Alert string**: `Add text, media, or audio.`  
  `CreateScreen.tsx:3584`
- **placeholder**: `Add voice caption…`  
  `CreateScreen.tsx:7110`
- **Alert string**: `Allow camera access to capture.`  
  `CreateScreen.tsx:3236`
- **Alert string**: `Allow microphone to record a voiceover.`  
  `CreateScreen.tsx:3955`
- **Alert string**: `Audio sync will be available in a future update.`  
  `CreateScreen.tsx:5637`
- **Alert string**: `Auto captions will be available in a future update.`  
  `CreateScreen.tsx:5906`
- **Alert string**: `Busy`  
  `CreateScreen.tsx:3030`
- **Alert string**: `Camera`  
  `CreateScreen.tsx:3040`
- **Alert string**: `Camera`  
  `CreateScreen.tsx:3044`
- **Alert string**: `Camera`  
  `CreateScreen.tsx:3136`
- **Alert string**: `Camera`  
  `CreateScreen.tsx:3162`
- **Alert string**: `Camera`  
  `CreateScreen.tsx:3169`
- **Alert string**: `Camera`  
  `CreateScreen.tsx:3236`
- **Alert string**: `Camera error`  
  `CreateScreen.tsx:2973`
- **Alert string**: `Camera error`  
  `CreateScreen.tsx:2977`
- **Alert string**: `Camera error`  
  `CreateScreen.tsx:3051`
- **Alert string**: `Camera error`  
  `CreateScreen.tsx:3065`
- **Alert string**: `Camera error`  
  `CreateScreen.tsx:3075`
- **Alert string**: `Camera error`  
  `CreateScreen.tsx:3100`
- **Alert string**: `Camera error`  
  `CreateScreen.tsx:3207`
- **Alert string**: `Camera error`  
  `CreateScreen.tsx:3222`
- **Alert string**: `Camera is not available.`  
  `CreateScreen.tsx:3136`
- **Alert string**: `Camera is not available.`  
  `CreateScreen.tsx:3169`
- **Alert string**: `Camera is not available. Try again.`  
  `CreateScreen.tsx:3040`
- **Alert string**: `Camera is still initializing, try again.`  
  `CreateScreen.tsx:3044`
- **Alert string**: `Camera permission needed`  
  `CreateScreen.tsx:3035`
- **Alert string**: `Cannot post`  
  `CreateScreen.tsx:3318`
- **Alert string**: `Cannot post`  
  `CreateScreen.tsx:3325`
- **Alert string**: `Cannot post`  
  `CreateScreen.tsx:3584`
- **Alert string**: `Clips must be under 60 seconds.`  
  `CreateScreen.tsx:3360`
- **Alert string**: `Coming Soon`  
  `CreateScreen.tsx:5637`
- **Alert string**: `Coming Soon`  
  `CreateScreen.tsx:5668`
- **Alert string**: `Coming Soon`  
  `CreateScreen.tsx:5674`
- **Alert string**: `Coming Soon`  
  `CreateScreen.tsx:5697`
- **Alert string**: `Coming Soon`  
  `CreateScreen.tsx:5906`
- **Alert string**: `Content saved to your camera roll.`  
  `CreateScreen.tsx:4102`
- **Alert string**: `Converted file is empty`  
  `CreateScreen.tsx:452`
- **Alert string**: `Converted file is empty`  
  `CreateScreen.tsx:537`
- **Alert string**: `Could not attach soundtrack`  
  `CreateScreen.tsx:2806`
- **Alert string**: `Could not capture photo.`  
  `CreateScreen.tsx:3051`
- **Alert string**: `Could not capture photo.`  
  `CreateScreen.tsx:3100`
- **Alert string**: `Could not finish recording.`  
  `CreateScreen.tsx:3979`
- **Alert string**: `Could not prepare photo for preview.`  
  `CreateScreen.tsx:3075`
- **Alert string**: `Could not prepare video for upload. Please try again.`  
  `CreateScreen.tsx:2405`
- **Alert string**: `Could not publish story`  
  `CreateScreen.tsx:2634`
- **Alert string**: `Could not publish this post.`  
  `CreateScreen.tsx:3590`
- **Alert string**: `Could not record video.`  
  `CreateScreen.tsx:3207`
- **Alert string**: `Could not record video.`  
  `CreateScreen.tsx:3222`
- **Alert string**: `Could not save this media to camera roll.`  
  `CreateScreen.tsx:4105`
- **Alert string**: `Could not save voice as a reusable sound.`  
  `CreateScreen.tsx:390`
- **Alert string**: `Could not save voice as a reusable sound.`  
  `CreateScreen.tsx:396`
- **Alert string**: `Could not send`  
  `CreateScreen.tsx:3383`
- **Alert string**: `Could not start recording.`  
  `CreateScreen.tsx:3964`
- **Alert string**: `Could not upload media. Please try again.`  
  `CreateScreen.tsx:2505`
- **Alert string**: `Could not upload media. Please try again.`  
  `CreateScreen.tsx:2533`
- **Alert string**: `Could not upload media. Please try again.`  
  `CreateScreen.tsx:3366`
- **Alert string**: `Cover unavailable`  
  `CreateScreen.tsx:3697`
- **Alert string**: `Cut editing will be available in a future update.`  
  `CreateScreen.tsx:5674`
- **Alert string**: `Error`  
  `CreateScreen.tsx:3588`
- **Alert string**: `Error`  
  `CreateScreen.tsx:3590`
- **Alert string**: `File does not exist`  
  `CreateScreen.tsx:433`
- **Alert string**: `File does not exist`  
  `CreateScreen.tsx:518`
- **Alert string**: `File is 0 bytes before upload`  
  `CreateScreen.tsx:439`
- **Alert string**: `File is 0 bytes before upload`  
  `CreateScreen.tsx:524`
- **Alert string**: `Filters will be available in a future update.`  
  `CreateScreen.tsx:5697`
- **Alert string**: `INSERT ERROR`  
  `CreateScreen.tsx:331`
- **Alert string**: `INSERT ERROR`  
  `CreateScreen.tsx:340`
- **Alert string**: `INSERT ERROR`  
  `CreateScreen.tsx:2372`
- **Alert string**: `Insert will fail — sign in again.`  
  `CreateScreen.tsx:2617`
- **Alert string**: `Insert will fail — sign in again.`  
  `CreateScreen.tsx:3341`
- **Alert string**: `Invalid photo path from camera.`  
  `CreateScreen.tsx:3065`
- **Alert string**: `Media file is missing. Capture or choose media again.`  
  `CreateScreen.tsx:3325`
- **Alert string**: `Microphone`  
  `CreateScreen.tsx:3955`
- **Alert string**: `No authenticated user`  
  `CreateScreen.tsx:2617`
- **Alert string**: `No authenticated user`  
  `CreateScreen.tsx:3341`
- **Alert string**: `Permission needed`  
  `CreateScreen.tsx:2861`
- **Alert string**: `Permission needed`  
  `CreateScreen.tsx:3157`
- **Alert string**: `Permission needed`  
  `CreateScreen.tsx:3656`
- **Alert string**: `Permission needed`  
  `CreateScreen.tsx:4097`
- **Alert string**: `Photo file path was missing. Please try again.`  
  `CreateScreen.tsx:2973`
- **accessibilityLabel**: `Play preview`  
  `CreateScreen.tsx:4495`
- **Alert string**: `Please allow camera access to capture content.`  
  `CreateScreen.tsx:3035`
- **Alert string**: `Please allow camera and microphone access to record video.`  
  `CreateScreen.tsx:3157`
- **Alert string**: `Please allow media library access to save captured content.`  
  `CreateScreen.tsx:4097`
- **Alert string**: `Please allow photo library access to choose a cover.`  
  `CreateScreen.tsx:3656`
- **Alert string**: `Please allow photo library access to select media.`  
  `CreateScreen.tsx:2861`
- **Alert string**: `Save failed`  
  `CreateScreen.tsx:4105`
- **Alert string**: `Saved`  
  `CreateScreen.tsx:4102`
- **placeholder**: `Search locations...`  
  `CreateScreen.tsx:6833`
- **placeholder**: `Search song or artist`  
  `CreateScreen.tsx:4518`
- **placeholder**: `Search users...`  
  `CreateScreen.tsx:6757`
- **Alert string**: `Split editing will be available in a future update.`  
  `CreateScreen.tsx:5668`
- **Alert string**: `Stop recording before taking a photo.`  
  `CreateScreen.tsx:3030`
- **Alert string**: `Stories must be under 60 seconds`  
  `CreateScreen.tsx:2359`
- **Alert string**: `Stories must be under 60 seconds`  
  `CreateScreen.tsx:2453`
- **Alert string**: `Story too long`  
  `CreateScreen.tsx:2359`
- **Alert string**: `Story too long`  
  `CreateScreen.tsx:2453`
- **Alert string**: `Try again or pick a sound manually.`  
  `CreateScreen.tsx:2806`
- **placeholder**: `Type on-screen text`  
  `CreateScreen.tsx:5759`
- **Alert string**: `UPLOAD FAILED`  
  `CreateScreen.tsx:479`
- **Alert string**: `UPLOAD FAILED`  
  `CreateScreen.tsx:555`
- **Alert string**: `Upload failed`  
  `CreateScreen.tsx:433`
- **Alert string**: `Upload failed`  
  `CreateScreen.tsx:439`
- **Alert string**: `Upload failed`  
  `CreateScreen.tsx:452`
- **Alert string**: `Upload failed`  
  `CreateScreen.tsx:493`
- **Alert string**: `Upload failed`  
  `CreateScreen.tsx:518`
- **Alert string**: `Upload failed`  
  `CreateScreen.tsx:524`
- **Alert string**: `Upload failed`  
  `CreateScreen.tsx:537`
- **Alert string**: `Upload failed`  
  `CreateScreen.tsx:569`
- **Alert string**: `Upload failed`  
  `CreateScreen.tsx:2405`
- **Alert string**: `Upload failed`  
  `CreateScreen.tsx:2505`
- **Alert string**: `Upload failed`  
  `CreateScreen.tsx:2533`
- **Alert string**: `Upload failed`  
  `CreateScreen.tsx:3366`
- **Alert string**: `Uploaded file is not accessible`  
  `CreateScreen.tsx:493`
- **Alert string**: `Uploaded file is not accessible`  
  `CreateScreen.tsx:569`
- **Alert string**: `Use a photo from gallery as cover, or rebuild iOS dev client for frame extraction.`  
  `CreateScreen.tsx:3697`
- **Alert string**: `Video file path was missing. Please try again.`  
  `CreateScreen.tsx:2977`
- **Alert string**: `Video too long`  
  `CreateScreen.tsx:3360`
- **Alert string**: `Voice sound`  
  `CreateScreen.tsx:390`
- **Alert string**: `Voice sound`  
  `CreateScreen.tsx:396`
- **Alert string**: `Voiceover`  
  `CreateScreen.tsx:3964`
- **Alert string**: `Voiceover`  
  `CreateScreen.tsx:3979`
- **Alert string**: `Wait for the preview to finish loading.`  
  `CreateScreen.tsx:3162`
- **placeholder**: `Write a caption...`  
  `CreateScreen.tsx:6631`

#### `EditProfileScreen`
- **placeholder**: `Add a link`  
  `EditProfileScreen.tsx:163`
- **placeholder**: `Add pronouns`  
  `EditProfileScreen.tsx:152`
- **placeholder**: `Email address`  
  `EditProfileScreen.tsx:168`
- **placeholder**: `Username`  
  `EditProfileScreen.tsx:151`
- **placeholder**: `Write a bio...`  
  `EditProfileScreen.tsx:158`
- **placeholder**: `Your name`  
  `EditProfileScreen.tsx:150`

#### `ExploreScreen`
- **placeholder**: `Search users, posts, sounds`  
  `ExploreScreen.tsx:993`

#### `HomeFeedScreen`
- **placeholder**: `Add a comment...`  
  `HomeFeedScreen.tsx:815`
- **Alert string**: `Add to Story`  
  `HomeFeedScreen.tsx:2016`
- **placeholder**: `Artist name`  
  `HomeFeedScreen.tsx:5698`
- **Alert string**: `Auth required`  
  `HomeFeedScreen.tsx:1955`
- **Alert string**: `Block user?`  
  `HomeFeedScreen.tsx:3466`
- **Alert string**: `Blocked`  
  `HomeFeedScreen.tsx:3474`
- **Alert string**: `Camera access is required.`  
  `HomeFeedScreen.tsx:2022`
- **placeholder**: `Caption`  
  `HomeFeedScreen.tsx:5680`
- **Alert string**: `Choose how to add your story`  
  `HomeFeedScreen.tsx:2016`
- **Alert string**: `Could not delete story.`  
  `HomeFeedScreen.tsx:4005`
- **Alert string**: `Could not publish story.`  
  `HomeFeedScreen.tsx:1996`
- **Alert string**: `Delete post?`  
  `HomeFeedScreen.tsx:3360`
- **Alert string**: `Gallery access is required.`  
  `HomeFeedScreen.tsx:2040`
- **Alert string**: `Open Create to preview before posting a story.`  
  `HomeFeedScreen.tsx:5524`
- **Alert string**: `Permission needed`  
  `HomeFeedScreen.tsx:2022`
- **Alert string**: `Permission needed`  
  `HomeFeedScreen.tsx:2040`
- **Alert string**: `Please sign in again to post a story.`  
  `HomeFeedScreen.tsx:1955`
- **Alert string**: `Please try again.`  
  `HomeFeedScreen.tsx:3498`
- **Alert string**: `Posts from this account are hidden from your feed.`  
  `HomeFeedScreen.tsx:3474`
- **Alert string**: `Posts from this account are now hidden from your feed.`  
  `HomeFeedScreen.tsx:3504`
- **Alert string**: `Report submitted`  
  `HomeFeedScreen.tsx:3448`
- **Alert string**: `Reporting unavailable`  
  `HomeFeedScreen.tsx:3443`
- **Alert string**: `Run latest migrations to enable reporting.`  
  `HomeFeedScreen.tsx:3443`
- **Alert string**: `Run latest migrations to use this setting.`  
  `HomeFeedScreen.tsx:3421`
- **placeholder**: `Search users, posts, sounds`  
  `HomeFeedScreen.tsx:5167`
- **Alert string**: `Setting unavailable`  
  `HomeFeedScreen.tsx:3421`
- **Alert string**: `Stories are limited to 60 seconds.`  
  `HomeFeedScreen.tsx:1960`
- **Alert string**: `Story error`  
  `HomeFeedScreen.tsx:1996`
- **Alert string**: `Story error`  
  `HomeFeedScreen.tsx:3999`
- **Alert string**: `Story error`  
  `HomeFeedScreen.tsx:4005`
- **Alert string**: `Story unavailable`  
  `HomeFeedScreen.tsx:5524`
- **Alert string**: `Thanks. We will review this content.`  
  `HomeFeedScreen.tsx:3448`
- **Alert string**: `This will remove the post for everyone.`  
  `HomeFeedScreen.tsx:3360`
- **placeholder**: `Track name`  
  `HomeFeedScreen.tsx:5691`
- **Alert string**: `Try again after syncing the latest migrations.`  
  `HomeFeedScreen.tsx:3348`
- **Alert string**: `Try again in a moment.`  
  `HomeFeedScreen.tsx:3372`
- **Alert string**: `Unable to delete post`  
  `HomeFeedScreen.tsx:3372`
- **Alert string**: `Unable to edit post`  
  `HomeFeedScreen.tsx:3348`
- **Alert string**: `Unfollow unavailable`  
  `HomeFeedScreen.tsx:3498`
- **Alert string**: `Unfollowed`  
  `HomeFeedScreen.tsx:3504`
- **Alert string**: `Video too long`  
  `HomeFeedScreen.tsx:1960`
- **Alert string**: `You can only delete your own story.`  
  `HomeFeedScreen.tsx:3999`
- **Alert string**: `You will no longer see this account in your feed.`  
  `HomeFeedScreen.tsx:3466`

#### `MessagesScreen`
- **placeholder**: `Search chats…`  
  `MessagesScreen.tsx:102`

#### `PostDetailScreen`
- **placeholder**: `Add a comment...`  
  `PostDetailScreen.tsx:1175`
- **Alert string**: `Delete post?`  
  `PostDetailScreen.tsx:811`
- **Alert string**: `This will remove the post for everyone.`  
  `PostDetailScreen.tsx:811`
- **Alert string**: `Try again in a moment.`  
  `PostDetailScreen.tsx:826`
- **Alert string**: `Unable to delete post`  
  `PostDetailScreen.tsx:826`

#### `PrivacyScreen`
- **Alert string**: `Error`  
  `PrivacyScreen.tsx:117`

#### `ProfileScreen`
- **placeholder**: `Add a comment...`  
  `ProfileScreen.tsx:3618`
- **placeholder**: `Artist name`  
  `ProfileScreen.tsx:3750`
- **Alert string**: `Avatar error`  
  `ProfileScreen.tsx:1079`
- **placeholder**: `Caption`  
  `ProfileScreen.tsx:3732`
- **Alert string**: `Comment error`  
  `ProfileScreen.tsx:1601`
- **Alert string**: `Could not add your comment.`  
  `ProfileScreen.tsx:1601`
- **Alert string**: `Could not lift this post right now.`  
  `ProfileScreen.tsx:2582`
- **Alert string**: `Could not upload profile picture.`  
  `ProfileScreen.tsx:1079`
- **Alert string**: `Could not upload profile picture. Please try again.`  
  `ProfileScreen.tsx:1040`
- **Alert string**: `Delete post?`  
  `ProfileScreen.tsx:1875`
- **Alert string** 🅡: `Lift unavailable`  
  `ProfileScreen.tsx:2582`
- **Alert string**: `Not signed in`  
  `ProfileScreen.tsx:1005`
- **Alert string**: `Permission needed`  
  `ProfileScreen.tsx:985`
- **Alert string**: `Photo uploaded but could not save to your profile. Try again.`  
  `ProfileScreen.tsx:1070`
- **Alert string**: `Please allow photo library access to choose a profile picture.`  
  `ProfileScreen.tsx:985`
- **Alert string**: `Please sign in again to upload a profile picture.`  
  `ProfileScreen.tsx:1005`
- **Alert string**: `Report submitted`  
  `ProfileScreen.tsx:1942`
- **Alert string**: `Reporting unavailable`  
  `ProfileScreen.tsx:1937`
- **Alert string**: `Run latest migrations to enable reporting.`  
  `ProfileScreen.tsx:1937`
- **Alert string**: `Run latest migrations to use this setting.`  
  `ProfileScreen.tsx:1916`
- **Alert string**: `Save failed`  
  `ProfileScreen.tsx:1070`
- **Alert string**: `Setting unavailable`  
  `ProfileScreen.tsx:1916`
- **Alert string**: `Thanks. We will review this content.`  
  `ProfileScreen.tsx:1942`
- **Alert string**: `This will remove the post from your profile.`  
  `ProfileScreen.tsx:1875`
- **placeholder**: `Track name`  
  `ProfileScreen.tsx:3743`
- **Alert string**: `Try again after syncing latest migrations.`  
  `ProfileScreen.tsx:1864`
- **Alert string**: `Try again in a moment.`  
  `ProfileScreen.tsx:1889`
- **Alert string**: `Unable to delete post`  
  `ProfileScreen.tsx:1889`
- **Alert string**: `Unable to update post`  
  `ProfileScreen.tsx:1864`
- **Alert string**: `Upload failed`  
  `ProfileScreen.tsx:1040`
- **accessibilityLabel**: `View Identity`  
  `ProfileScreen.tsx:2624`

#### `SecurityScreen`
- **Alert string**: `A verification code will be sent to your email each time you sign in.`  
  `SecurityScreen.tsx:86`
- **Alert string**: `Error`  
  `SecurityScreen.tsx:82`
- **Alert string**: `Error`  
  `SecurityScreen.tsx:117`
- **Alert string**: `Error`  
  `SecurityScreen.tsx:133`
- **Alert string**: `Login verification enabled`  
  `SecurityScreen.tsx:86`
- **placeholder**: `Search users to block`  
  `SecurityScreen.tsx:195`
- **Alert string**: `They won\`  
  `SecurityScreen.tsx:112`

#### `SessionScreen`
- **Alert string**: `Are you sure you want to sign out?`  
  `SessionScreen.tsx:31`
- **Alert string**: `Sign out`  
  `SessionScreen.tsx:31`

#### `VerificationScreen`
- **placeholder**: `Anything you`  
  `VerificationScreen.tsx:459`
- **placeholder**: `Your brand, company, or publication name`  
  `VerificationScreen.tsx:426`
- **placeholder**: `https://example.com`  
  `VerificationScreen.tsx:446`

#### `app/create/*`
- **placeholder**: `Write your powr`  
  `app/create/powr/page.tsx:14`

#### `app/explore/*`
- **placeholder**: `Search people`  
  `app/explore/page.tsx:319`

#### `app/messages/*`
- **placeholder**: `Message…`  
  `app/messages/[id]/page.tsx:94`

#### `components/AccountTypePicker`
- **accessibilityLabel**: `Close`  
  `components/AccountTypePicker.tsx:117`

#### `components/AddAccountModal`
- **placeholder**: `Email`  
  `components/AddAccountModal.tsx:150`
- **placeholder**: `Password`  
  `components/AddAccountModal.tsx:163`
- **Alert string**: `Password must be at least 8 characters.`  
  `components/AddAccountModal.tsx:65`
- **Alert string**: `Password too short`  
  `components/AddAccountModal.tsx:65`
- **Alert string**: `Please enter your email and password.`  
  `components/AddAccountModal.tsx:40`
- **Alert string**: `Please fill in all fields.`  
  `components/AddAccountModal.tsx:61`
- **Alert string**: `Required`  
  `components/AddAccountModal.tsx:40`
- **Alert string**: `Required`  
  `components/AddAccountModal.tsx:61`
- **Alert string**: `Sign in failed`  
  `components/AddAccountModal.tsx:50`
- **Alert string**: `Sign up failed`  
  `components/AddAccountModal.tsx:76`
- **placeholder**: `Username`  
  `components/AddAccountModal.tsx:137`

#### `components/GifPicker`
- **placeholder**: `Search GIFs`  
  `components/GifPicker.tsx:115`

#### `components/HomePostPreview`
- **Alert string**: `Could not start recording`  
  `components/HomePostPreview.tsx:729`
- **accessibilityLabel**: `Dismiss echoes`  
  `components/HomePostPreview.tsx:1065`
- **Alert string** 🅡: `Echo`  
  `components/HomePostPreview.tsx:713`
- **Alert string** 🅡: `Lift`  
  `components/HomePostPreview.tsx:696`
- **Alert string** 🅡: `Lift`  
  `components/HomePostPreview.tsx:783`
- **Alert string**: `Microphone`  
  `components/HomePostPreview.tsx:729`
- **Alert string**: `Sign in to lift echoes.`  
  `components/HomePostPreview.tsx:696`
- **Alert string**: `Sign in to lift.`  
  `components/HomePostPreview.tsx:783`
- **Alert string**: `Voice echoes are not available on web yet.`  
  `components/HomePostPreview.tsx:713`

#### `components/MentionInput`
- **placeholder**: `Write a bio...`  
  `components/MentionInput.tsx:31`

#### `components/MusicPicker`
- **placeholder**: `Audio URL (.mp3/.wav/.m4a/.aac/.ogg)`  
  `components/MusicPicker.tsx:702`
- **placeholder**: `Search tracks`  
  `components/MusicPicker.tsx:337`
- **placeholder**: `Sound title`  
  `components/MusicPicker.tsx:686`
- **Alert string**: `Sound unavailable`  
  `components/MusicPicker.tsx:251`
- **Alert string**: `Track unavailable`  
  `components/MusicPicker.tsx:625`

#### `components/OTPVerificationModal`
- **Alert string**: `Error`  
  `components/OTPVerificationModal.tsx:62`
- **Alert string**: `Invalid code`  
  `components/OTPVerificationModal.tsx:92`

#### `screens/DropComposerScreen`
- **accessibilityLabel**: `Close`  
  `screens/DropComposerScreen.tsx:452`
- **placeholder**: `Say something about this Drop…`  
  `screens/DropComposerScreen.tsx:698`

#### `screens/EditTaglineScreen`
- **Alert string**: `Could not save your tagline right now.`  
  `screens/EditTaglineScreen.tsx:110`
- **Alert string**: `Save failed`  
  `screens/EditTaglineScreen.tsx:110`
- **placeholder**: `Write your identity`  
  `screens/EditTaglineScreen.tsx:155`
- **placeholder**: `artist_name`  
  `screens/EditTaglineScreen.tsx:208`
- **placeholder**: `track_name`  
  `screens/EditTaglineScreen.tsx:224`

#### `screens/ProfileDisplayScreen`
- **placeholder**: `Optional`  
  `screens/ProfileDisplayScreen.tsx:182`
- **placeholder**: `Optional`  
  `screens/ProfileDisplayScreen.tsx:205`
- **placeholder**: `https://`  
  `screens/ProfileDisplayScreen.tsx:226`

#### `screens/TrustedDevicesScreen`
- **Alert string**: `1 device signed out`  
  `screens/TrustedDevicesScreen.tsx:146`
- **Alert string**: `Could not rename`  
  `screens/TrustedDevicesScreen.tsx:100`
- **Alert string**: `Could not revoke all other devices.`  
  `screens/TrustedDevicesScreen.tsx:142`
- **Alert string**: `Could not revoke device.`  
  `screens/TrustedDevicesScreen.tsx:119`
- **placeholder**: `Device name`  
  `screens/TrustedDevicesScreen.tsx:182`
- **Alert string**: `Done`  
  `screens/TrustedDevicesScreen.tsx:146`
- **Alert string**: `Error`  
  `screens/TrustedDevicesScreen.tsx:119`
- **Alert string**: `Error`  
  `screens/TrustedDevicesScreen.tsx:142`
- **Alert string**: `Please try again.`  
  `screens/TrustedDevicesScreen.tsx:100`

### 23.3 JSX text & conditional labels — `screens/DropComposerScreen` (manual)

Verbatim user-facing strings; dynamic segments noted. **Brand / product vocabulary:** repeated use of **Drop** and voice-premiere framing (web should match punctuation and curly apostrophe in the success body copy).

| String (verbatim) | Location | Interpolation / notes |
|-------------------|----------|------------------------|
| `{errorMessage}` | `screens/DropComposerScreen.tsx:459–460` | Runtime error from state |
| `Create a Drop` | `screens/DropComposerScreen.tsx:467` | — |
| `Record a voice strip to premiere at a time you choose.` | `screens/DropComposerScreen.tsx:469` | — |
| `Tap to start recording` | `screens/DropComposerScreen.tsx:502` | — |
| `Recording` | `screens/DropComposerScreen.tsx:506` | — |
| `{formatElapsed(recordingElapsedMs)}` | `screens/DropComposerScreen.tsx:507` | Timer display |
| `Tap again to stop` | `screens/DropComposerScreen.tsx:509` | — |
| `{getTypeLabel(accountType)} accounts: {durMin}–{durMax} seconds` | `screens/DropComposerScreen.tsx:528` | Account tier copy |
| `Review` | `screens/DropComposerScreen.tsx:537` | — |
| `{recordedDurationSec.toFixed(1)}s recorded` | `screens/DropComposerScreen.tsx:540` | Duration |
| `Stop` / `Play` | `screens/DropComposerScreen.tsx:557` | Ternary on preview state |
| `Re-record` | `screens/DropComposerScreen.tsx:576` | — |
| `Choose time & caption` | `screens/DropComposerScreen.tsx:594` | — |
| `Voice must be between {min} and {max} seconds for your account.` | `screens/DropComposerScreen.tsx:600–601` | Uses `DROP_DURATION_RANGES[accountType]` |
| `Schedule` | `screens/DropComposerScreen.tsx:614` | — |
| `Schedule for any time from now onward.` | `screens/DropComposerScreen.tsx:617` | — |
| `Date` | `screens/DropComposerScreen.tsx:635` | — |
| `{scheduledFor.toLocaleDateString()}` | `screens/DropComposerScreen.tsx:637` | Locale-formatted |
| `Time` | `screens/DropComposerScreen.tsx:656` | — |
| `{scheduledFor.toLocaleTimeString(...)}` | `screens/DropComposerScreen.tsx:658` | Locale-formatted |
| `Hide date` | `screens/DropComposerScreen.tsx:686` | iOS only |
| `Hide time` | `screens/DropComposerScreen.tsx:689` | iOS only |
| `Caption (optional)` | `screens/DropComposerScreen.tsx:694` | — |
| *(placeholder also in §23.2)* `Say something about this Drop…` | `screens/DropComposerScreen.tsx:698` | — |
| `Pick a time in the future to continue.` | `screens/DropComposerScreen.tsx:718` | — |
| `Schedule Drop` | `screens/DropComposerScreen.tsx:743` | — |
| `Drop scheduled` | `screens/DropComposerScreen.tsx:754` | — |
| `Your voice will premiere at the time you chose. You’ll get reminders in the app.` | `screens/DropComposerScreen.tsx:757` | Curly apostrophe in `You’ll` |
| `Done` | `screens/DropComposerScreen.tsx:769` | — |

---

## 24. Component Inventory (`components/`)

| Component | Purpose |
|-----------|---------|
| `AccountTypeConfirmModal` | Confirm account type choices |
| `AccountTypePicker` | Pick type/category |
| `AddAccountModal` | Multi-account add |
| `AlignmentCard` | Alignment UI |
| `CarouselMedia` | Multi-image carousel |
| `charts/ChartItem` | Chart row |
| `CreatePickerSheet` | Post vs Drop chooser |
| `discoveryStripTokens` | Layout constants |
| `ExploreReelCard` | Explore reel cell |
| `FeedPostMusicPlayback` | Feed music playback |
| `GifPicker` | GIF selection |
| `HomeNowFeedCard` | Home/Now card wrapper |
| `HomePostPreview` | **Core feed/post renderer** |
| `HomePowrPreview` | POWR-specific home preview |
| `HomePowerThoughtCard` | Thought/POWR variant |
| `IdentityMomentsStrip` / `Wrapper` | Identity moments |
| `identity/*` | Identity header, metrics, sections, chips, music list |
| `LyricStrip` | Lyrics UI |
| `MentionInput` | @ mentions |
| `MusicPicker` | Music attach + Spotify |
| `MusicPill` | Compact music chip |
| `NowFeedContainer` / `NowFeedRuntime` | Now feed orchestration |
| `NowPost` | Now post cell |
| `OTPVerificationModal` | 2FA OTP |
| `PostItem` | Adapter to `HomePostPreview` |
| `PostRasterImage` | Image rendering |
| `PowrIdentityStreamRow` | Profile POWR row |
| `ShareSheet` | Sharing |
| `SoundMomentsStrip` / `Wrapper` | Sound moments |
| `StoryBar` / `StoryViewer` | Stories |
| `TaglineStrip` | Tagline display |
| `TapTouchable` | Touch feedback primitive |
| `UserIdentityRow` | User row |
| `VerifiedBadge` | Verification badge |
| `VoicePill` | Voice chip |
| `VoiceStrip` | Voice playback strip |
| `web/WebHomeFeed` / `web/StoryBar` | Web-specific |

---

## 25. Open Questions / Ambiguities / Issues for AQRA

1. **DB vs client schedule window:** `drops_scheduled_for_valid` in SQL may still enforce **10 min – 7 days** while client `isValidScheduleTime` allows **0 min – 365 days** — inserts may fail until migration aligns.
2. **Identity fallbacks:** `IdentityScreen` uses hardcoded `FALLBACK_*` strings — product intent for production vs demo unclear.
3. **`HOME_FEED_POSTS_RECOVERY_MODE` / `PROFILE_POSTS_RECOVERY_MODE` flags:** temporary recovery paths — web should not mirror blindly.
4. **Echo debug logs:** `services/echoes.ts` logs user/post in production paths — noise/privacy review.
5. **`navigation.ts` `goToUser`:** uses Next router (`/identity/...`) — primarily web helper; verify usage from native.
6. **Typography exhaustiveness:** §2 is sampled; full parity needs pass over every screen file.
7. **Color exhaustiveness:** §1 catalogs major tokens; grep-based full hex audit not run.
8. **Sessions vs “Session” screen naming:** User-facing “Session” is account/session management, not live events — avoid confusion with product “Sessions” feature if planned.
9. **Admin:** No native admin affordances found; web admin remains separate.
10. **WEB_DIRECTION §4:** Referenced in user prompt for Drops web rendering — document not present in audited paths; reconcile separately.

---

**End of NATIVE_SPEC.md**
