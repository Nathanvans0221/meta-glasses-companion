import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useConversationStore } from '../stores/conversationStore';
import { COLORS } from '../constants';

export function TranscriptView() {
  const messages = useConversationStore((s) => s.messages);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          Tap and hold the button to start talking
        </Text>
        <Text style={styles.emptySubtext}>
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
            msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
            msg.role === 'system' && styles.systemBubble,
          ]}
        >
          <Text style={styles.roleLabel}>
            {msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'AI' : 'System'}
          </Text>
          <Text style={styles.messageText}>{msg.text}</Text>
          <Text style={styles.timestamp}>
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
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.accent,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: COLORS.surfaceLight,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  systemBubble: {
    backgroundColor: 'transparent',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  roleLabel: {
    color: COLORS.highlight,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  messageText: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 20,
  },
  timestamp: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
    opacity: 0.6,
  },
});
