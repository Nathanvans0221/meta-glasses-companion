import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useConversationStore } from '../stores/conversationStore';
import { useTheme } from '../hooks/useTheme';
import { SPACING, TYPOGRAPHY, RADIUS } from '../design/tokens';

export function TranscriptView() {
  const colors = useTheme();
  const messages = useConversationStore((s) => s.messages);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.accentLight }]}>
          <Ionicons name="chatbubbles-outline" size={32} color={colors.accent} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          Start a Conversation
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          Hold the mic button to speak, or type a message below
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {messages.map((msg) => {
        if (msg.role === 'system') {
          return (
            <View key={msg.id} style={styles.systemRow}>
              <Text style={[styles.systemText, { color: colors.textTertiary }]}>
                {msg.text}
              </Text>
            </View>
          );
        }

        const isUser = msg.role === 'user';

        return (
          <View
            key={msg.id}
            style={[
              styles.bubbleRow,
              isUser ? styles.userRow : styles.assistantRow,
            ]}
          >
            <View
              style={[
                styles.bubble,
                isUser
                  ? [styles.userBubble, { backgroundColor: colors.accent }]
                  : [styles.assistantBubble, { backgroundColor: colors.surfaceElevated }],
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  { color: isUser ? '#FFFFFF' : colors.text },
                ]}
              >
                {msg.text}
              </Text>
              <Text
                style={[
                  styles.timestamp,
                  { color: isUser ? 'rgba(255,255,255,0.6)' : colors.textTertiary },
                ]}
              >
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING['3xl'],
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    ...TYPOGRAPHY.title3,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    ...TYPOGRAPHY.subheadline,
    textAlign: 'center',
    lineHeight: 22,
  },
  bubbleRow: {
    maxWidth: '82%',
  },
  userRow: {
    alignSelf: 'flex-end',
  },
  assistantRow: {
    alignSelf: 'flex-start',
  },
  bubble: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.xl,
  },
  userBubble: {
    borderBottomRightRadius: RADIUS.xs,
  },
  assistantBubble: {
    borderBottomLeftRadius: RADIUS.xs,
  },
  messageText: {
    ...TYPOGRAPHY.body,
  },
  timestamp: {
    ...TYPOGRAPHY.caption2,
    marginTop: SPACING.xs,
    alignSelf: 'flex-end',
  },
  systemRow: {
    alignSelf: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    maxWidth: '85%',
  },
  systemText: {
    ...TYPOGRAPHY.caption1,
    textAlign: 'center',
  },
});
