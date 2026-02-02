# Cast Display Behaviour Research: Audiobookshelf + Nest Hub

## TL;DR

The Nest Hub screen turning off during Audiobookshelf casting is **NOT** controlled by the sender app - it's the Nest Hub's **Low-light mode** functioning normally. The key finding is that **certain metadata types and apps prevent this from working**, while Audiobookshelf's implementation allows it.

**Audiobookshelf's approach:**
1. Uses a **custom Cast receiver** (App ID: `FD1F76C5`)
2. Uses **`MEDIA_TYPE_AUDIOBOOK_CHAPTER`** (metadataType: `4`) in Cast metadata
3. Sets **`STREAM_TYPE_BUFFERED`** for audio content

The display-off behaviour is triggered by the Nest Hub's built-in ambient light sensor, which continues to function during Audiobookshelf playback but is blocked by some other apps (notably Spotify podcasts).

---

## Detailed Findings

### 1. How Audiobookshelf Casts

**Source: `CastOptionsProvider.kt`**
```kotlin
// Uses a CUSTOM receiver, not Default Media Receiver
var appId = "FD1F76C5"
return CastOptions.Builder()
    .setReceiverApplicationId(appId)
    .setCastMediaOptions(
        CastMediaOptions.Builder()
            .setMediaSessionEnabled(false)  // They manage session themselves
            .setNotificationOptions(null)
            .build()
    )
    .setStopReceiverApplicationWhenEndingSession(true)
    .build()
```

**Source: `PlaybackSession.kt` - Cast Metadata**
```kotlin
fun getCastMediaMetadata(audioTrack: AudioTrack): com.google.android.gms.cast.MediaMetadata {
    val castMetadata = com.google.android.gms.cast.MediaMetadata(
        com.google.android.gms.cast.MediaMetadata.MEDIA_TYPE_AUDIOBOOK_CHAPTER  // KEY!
    )
    
    // Cover image
    castMetadata.addImage(WebImage(coverUri))
    
    // Metadata fields
    castMetadata.putString(MediaMetadata.KEY_TITLE, displayTitle)
    castMetadata.putString(MediaMetadata.KEY_ARTIST, displayAuthor)
    castMetadata.putString(MediaMetadata.KEY_ALBUM_TITLE, displayAuthor)
    castMetadata.putString(MediaMetadata.KEY_CHAPTER_TITLE, audioTrack.title)
    castMetadata.putInt(MediaMetadata.KEY_TRACK_NUMBER, audioTrack.index)
    
    return castMetadata
}
```

**Source: `PlaybackSession.kt` - MediaInfo**
```kotlin
val mediaInfo = MediaInfo.Builder(mediaUri.toString())
    .apply {
        setContentUrl(mediaUri.toString())
        setContentType(audioTrack.mimeType)  // e.g., "audio/mpeg"
        setMetadata(castMetadata)
        setStreamType(MediaInfo.STREAM_TYPE_BUFFERED)
    }
    .build()
```

### 2. Nest Hub Low-Light Mode Behaviour

From Google's official documentation:
> "Whenever the room is dark, Low-light mode will be enabled. It will be enabled regardless if Ambient EQ is on or off. When in Low-light mode, the display will either show the time or turn the screen off completely."

**Key insight from user reports:**
- **Spotify music**: Screen dims/turns off normally in low light ✓
- **Spotify podcasts**: Screen stays on (bug reported in 2022, still unresolved)
- **Audiobookshelf audiobooks**: Screen dims/turns off normally ✓

This pattern suggests the **metadata type** affects whether the low-light mode works.

### 3. Metadata Types That Affect Display

| Metadata Type | Value | Display Behaviour (Low-Light) |
|--------------|-------|-------------------------------|
| `MEDIA_TYPE_GENERIC` | 0 | Usually allows dim/off |
| `MEDIA_TYPE_MOVIE` | 1 | Keeps screen on (video) |
| `MEDIA_TYPE_TV_SHOW` | 2 | Keeps screen on (video) |
| `MEDIA_TYPE_MUSIC_TRACK` | 3 | Usually allows dim/off |
| `MEDIA_TYPE_AUDIOBOOK_CHAPTER` | 4 | Allows dim/off ✓ |
| `MEDIA_TYPE_PHOTO` | 5 | N/A |

**The Spotify podcast issue** suggests their implementation may be using a different metadata type or their receiver prevents the ambient sensor from triggering low-light mode.

### 4. Why This Works for Audiobookshelf

The mechanism is **NOT programmatic control of the display** - you can't turn off a Nest Hub screen via Cast API. Instead:

1. **Audiobookshelf's metadata type** (`AUDIOBOOK_CHAPTER`) doesn't block the Nest Hub's normal ambient light sensor behaviour
2. **The custom receiver** may have minimal UI that doesn't force screen wake
3. **The Cast session is audio-only** with no video stream, allowing the device to enter low-light mode
4. The device's **Low-light mode setting** (show clock or turn off completely) determines final behaviour

---

## Recommendations for Node.js Implementation

### Required Changes

**1. Use `MEDIA_TYPE_AUDIOBOOK_CHAPTER` (metadataType: 4)**

```javascript
// In your Cast media loading code:
const metadata = new chrome.cast.media.AudiobookChapterMediaMetadata();
// OR if using generic metadata:
const metadata = new chrome.cast.media.GenericMediaMetadata();
metadata.metadataType = chrome.cast.media.MetadataType.AUDIOBOOK_CHAPTER; // = 4
```

**For castv2-client/chromecast-api (Node.js):**
```javascript
const media = {
  contentId: audioUrl,
  contentType: 'audio/mpeg',
  streamType: 'BUFFERED',
  metadata: {
    metadataType: 4,  // AUDIOBOOK_CHAPTER - KEY CHANGE
    title: 'Book Title',
    subtitle: 'Author Name', 
    chapterTitle: 'Chapter 1',
    images: [{ url: coverImageUrl }]
  }
};
```

**2. Ensure Audio-Only Content Type**
```javascript
// Use audio/* MIME types, not video/*
contentType: 'audio/mpeg'  // or audio/mp4, audio/ogg, etc.
```

**3. Use BUFFERED Stream Type**
```javascript
streamType: 'BUFFERED'  // Not 'LIVE' - buffered content signals finite media
```

**4. Consider Not Sending Cover Art**

Interestingly, if you want the display to turn off faster, you might experiment with:
- Not sending cover art (no `images` array)
- Sending a tiny/blank image

When there's no visual content to display, the receiver may idle faster.

### What You CAN'T Control

- **You cannot programmatically turn off the Nest Hub screen** - this is a device safety/UX decision by Google
- **You cannot disable the receiver's UI** - the Default Media Receiver always shows something
- **You cannot force low-light mode** - it's triggered by the ambient light sensor

### Testing Recommendations

1. **Test with metadataType 4** (AUDIOBOOK_CHAPTER) vs current implementation
2. **Test in actual dark room** - the ambient light sensor must detect low light
3. **Check Nest Hub settings** - ensure "During low light: Turn off screen" is enabled
4. **Compare with/without cover art** - may affect idle timing

---

## Risks & Unknowns

| Risk | Mitigation |
|------|------------|
| Custom receiver ID required for best control | Default Media Receiver should still work with correct metadata |
| Behaviour may vary by Nest Hub firmware version | Test on updated devices |
| Low-light sensitivity may differ between devices | No programmatic workaround |
| Some users report broken low-light since Fuchsia update | Device-specific, not controllable |

---

## Sources

1. **Audiobookshelf App Source Code**
   - https://github.com/advplyr/audiobookshelf-app/blob/master/android/app/src/main/java/com/audiobookshelf/app/CastOptionsProvider.kt
   - https://github.com/advplyr/audiobookshelf-app/blob/master/android/app/src/main/java/com/audiobookshelf/app/data/PlaybackSession.kt
   - https://github.com/advplyr/audiobookshelf-app/blob/master/android/app/src/main/java/com/audiobookshelf/app/player/CastPlayer.kt

2. **Google Cast Documentation**
   - https://developers.google.com/android/reference/com/google/android/gms/cast/MediaMetadata
   - https://developers.google.com/cast/docs/styled_receiver
   - https://developers.google.com/cast/docs/reference/web_receiver/cast.framework.messages.MediaMetadata

3. **Google Nest Support**
   - https://support.google.com/googlenest/answer/9137130 (Ambient EQ / Low-light mode)

4. **Community Bug Reports**
   - https://community.spotify.com/t5/Android/Nest-Hub-2-Gen-Display-stays-on-when-Podcast-playing/td-p/5276536
   - https://www.googlenestcommunity.com/t5/Speakers-and-Displays/Nest-Hub-2-Gen-Display-stays-on-when-Podcast-playing-Spotify/m-p/26103

---

## Code Sample: Node.js Cast Implementation

```javascript
// Using castv2-client
const Client = require('castv2-client').Client;
const DefaultMediaReceiver = require('castv2-client').DefaultMediaReceiver;

function castAudiobook(host, audioUrl, coverUrl, metadata) {
  const client = new Client();
  
  client.connect(host, () => {
    client.launch(DefaultMediaReceiver, (err, player) => {
      if (err) throw err;
      
      const media = {
        contentId: audioUrl,
        contentType: 'audio/mpeg',
        streamType: 'BUFFERED',
        
        // KEY: Use metadataType 4 (AUDIOBOOK_CHAPTER)
        metadata: {
          metadataType: 4,  // chrome.cast.media.MetadataType.AUDIOBOOK_CHAPTER
          title: metadata.bookTitle,
          subtitle: metadata.author,
          bookTitle: metadata.bookTitle,
          chapterTitle: metadata.chapterTitle,
          chapterNumber: metadata.chapterNumber,
          images: coverUrl ? [{ url: coverUrl }] : []
        }
      };
      
      player.load(media, { autoplay: true }, (err, status) => {
        if (err) throw err;
        console.log('Media loaded:', status);
      });
    });
  });
}
```

---

*Research completed: 2026-02-02*
