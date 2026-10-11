import { Text, TextInput, View, type TextInputProps } from 'react-native';

type QuestionnaireFieldProps = TextInputProps & {
  label: string;
  suffix?: string;
};

export function QuestionnaireField({ label, suffix, ...props }: QuestionnaireFieldProps) {
  return (
    <View className="flex-1">
      <Text className="mb-2 text-base text-copy">{label}</Text>
      <View className="flex-row items-center rounded-card bg-canvas px-4">
        <TextInput className="flex-1 py-4 text-lg text-ink" placeholderTextColor="#9aa8a6" {...props} />
        {suffix ? <Text className="text-base text-copy">{suffix}</Text> : null}
      </View>
    </View>
  );
}
