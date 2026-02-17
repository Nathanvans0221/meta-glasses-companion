import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useConversationStore } from '../stores/conversationStore';
import { useTheme } from '../hooks/useTheme';

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
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Tap and hold the button to start talking
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          Your conversation will appear here
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {messages.map((msg) => (
        <View
          key={msg.id}
          style={[
            styles.bubble,
            msg.role === 'user' && [styles.userBubble, { backgroundColor: colors.accent }],
            msg.role === 'assistant' && [styles.assistantBubble, { backgroundColor: colors.surfaceLight }],
            msg.role === 'system' && [styles.systemBubble, { borderColor: colors.surfaceLight }],
          ]}
        >
          <Text style={[styles.roleLabel, { color: colors.highlight }]}>
            {msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'AI' : 'System'}
          </Text>
          <Text style={[styles.messageText, { color: colors.text }]}>{msg.text}</Text>
          <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
            {new Date(msg.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.6,
  },
  bubble: {
    padding: 12,
    borderRadius: 12,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  systemBubble: {
    backgroundColor: 'transparent',
    alignSelf: 'center',
    borderWidth: 1,
  },
  roleLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
    opacity: 0.6,
  },
});
