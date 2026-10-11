import { Text, View } from 'react-native';

export function QuestionnaireProgress({ step }: { step: 1 | 2 }) {
  return (
    <>
      <View className="mt-7 h-1.5 overflow-hidden rounded-full bg-line">
        <View className="h-full rounded-full bg-brand-hover" style={{ width: step === 1 ? '50%' : '100%' }} />
      </View>
      <Text className="mt-4 text-sm font-bold uppercase tracking-widest text-brand-dark">Step {step} of 2</Text>
    </>
  );
}
