import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { typography } from '../../theme/typography';
import { RADIUS_INNER, SURFACE, SURFACE_BORDER, TEXT, TEXT_FAINT } from '../../theme/ui';
import { ContentBlock, parseContent } from '../../lib/questionFormat';

/** Nothing may grow taller than this, or a tall diagram pushes the options off-screen. */
const MAX_IMAGE_HEIGHT = 340;

/**
 * A diagram inside a question, a solution or an option.
 *
 * React Native cannot lay out a remote image it has not measured — with no
 * height it collapses to nothing — so the intrinsic size is fetched first and
 * the box is drawn at the container's width in the image's own aspect ratio.
 */
function ContentImage({ url, alt }: { url: string; alt: string }) {
  const [ratio, setRatio] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setRatio(null);
    setFailed(false);
    Image.getSize(
      url,
      (w, h) => {
        if (alive && h > 0) setRatio(w / h);
      },
      () => {
        if (alive) setFailed(true);
      }
    );
    return () => {
      alive = false;
    };
  }, [url]);

  if (failed) {
    return (
      <View style={[styles.imageFrame, styles.imageFallback]}>
        <Text style={styles.imageFallbackText}>{alt || 'Image unavailable'}</Text>
      </View>
    );
  }

  if (ratio === null) {
    return <View style={[styles.imageFrame, styles.imagePlaceholder]} />;
  }

  return (
    <View style={styles.imageFrame}>
      <Image
        source={{ uri: url }}
        accessibilityLabel={alt}
        style={{ width: '100%', aspectRatio: ratio, maxHeight: MAX_IMAGE_HEIGHT }}
        resizeMode="contain"
      />
    </View>
  );
}

/**
 * Question bodies, options and solutions are all authored as one LaTeX string
 * with markdown images pasted into it, so all three render through here: text
 * runs as text, `![…](url)` runs as a picture.
 *
 * The text is drawn plain. A math renderer is the missing half — when one lands,
 * it replaces the `Text` below and every surface that shows a question gets it
 * at once.
 */
export default function RichContent({
  content,
  textStyle,
  blocks,
}: {
  content?: string | null;
  /** Pre-parsed blocks, when the caller already split the string. */
  blocks?: ContentBlock[];
  textStyle?: any;
}) {
  const parsed = blocks ?? parseContent(content);
  if (parsed.length === 0) return null;

  return (
    <View style={styles.stack}>
      {parsed.map((block, i) =>
        block.kind === 'text' ? (
          <Text key={i} style={[styles.text, textStyle]}>
            {block.text}
          </Text>
        ) : (
          <ContentImage key={i} url={block.url} alt={block.alt} />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  text: { color: TEXT, fontSize: 17, fontFamily: typography.regular, lineHeight: 26 },

  imageFrame: {
    borderRadius: RADIUS_INNER,
    overflow: 'hidden',
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
  },
  imagePlaceholder: { height: 160 },
  imageFallback: { height: 64, alignItems: 'center', justifyContent: 'center' },
  imageFallbackText: { color: TEXT_FAINT, fontSize: 13, fontFamily: typography.regular },
});
