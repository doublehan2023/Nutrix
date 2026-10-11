import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QuestionnaireField } from '@/components/profile/questionnaire-field';
import { QuestionnaireProgress } from '@/components/profile/questionnaire-progress';
import { SelectionChip } from '@/components/profile/selection-chip';
import {
  diabetesTypes,
  ethnicities,
  genders,
  managementOptions,
  useHealthQuestionnaire,
  type DiabetesType,
  type Ethnicity,
  type Gender,
  type ManagementOption,
} from '@/features/profile/health-questionnaire-context';

function toggleItem<T extends string>(items: T[], value: T) {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
}

export default function HealthQuestionnaireScreen() {
  const router = useRouter();
  const { answers, completeQuestionnaire, resetAnswers, updateAnswers } = useHealthQuestionnaire();
  const [step, setStep] = useState<1 | 2>(1);

  function leaveQuestionnaire() {
    resetAnswers();
    completeQuestionnaire();
    router.replace('/(tabs)');
  }

  function finishQuestionnaire() {
    completeQuestionnaire();
    router.replace('/profile');
  }

  function selectGender(gender: Gender) {
    updateAnswers({ gender, isPregnant: gender === 'Female' ? answers.isPregnant : undefined });
  }

  if (step === 2) {
    return (
      <SafeAreaView className="app-screen" edges={['top']}>
        <ScrollView contentContainerClassName="px-5 pb-12" showsVerticalScrollIndicator={false}>
          <View className="flex-row items-center justify-between pt-5">
            <Text className="text-2xl font-bold text-ink">Health questionnaire</Text>
            <Pressable accessibilityRole="button" onPress={leaveQuestionnaire}>
              <Text className="text-base font-bold text-brand-dark">Skip</Text>
            </Pressable>
          </View>
          <QuestionnaireProgress step={2} />
          <Text className="mt-3 text-3xl font-bold tracking-tight text-ink">Your diabetes history</Text>
          <Text className="app-body-copy mt-2">This helps personalize your glucose insights and predictions.</Text>

          <View className="app-card mt-6">
            <View className="flex-row items-center">
              <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-brand-soft">
                <Text className="font-bold text-brand-dark">2</Text>
              </View>
              <Text className="text-xl font-bold text-ink">Diabetes history</Text>
            </View>
            <Text className="mt-6 text-base font-semibold text-ink">Diabetes type</Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {diabetesTypes.map((type) => (
                <SelectionChip
                  key={type}
                  label={type}
                  onPress={() => updateAnswers({ diabetesType: type as DiabetesType })}
                  selected={answers.diabetesType === type}
                />
              ))}
            </View>

            <Text className="mt-7 text-base font-semibold text-ink">How do you manage diabetes?</Text>
            <Text className="mt-1 text-sm text-copy">Select all that apply</Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {managementOptions.map((option) => (
                <SelectionChip
                  key={option}
                  label={option}
                  onPress={() =>
                    updateAnswers({
                      diabetesManagement: toggleItem(answers.diabetesManagement, option as ManagementOption),
                    })
                  }
                  selected={answers.diabetesManagement.includes(option as ManagementOption)}
                />
              ))}
            </View>
          </View>

          <View className="mt-5 flex-row gap-3">
            <Pressable accessibilityRole="button" className="flex-1 items-center justify-center rounded-card border border-brand px-4 py-4" onPress={() => setStep(1)}>
              <Text className="text-base font-bold text-brand-dark">Back</Text>
            </Pressable>
            <Pressable accessibilityRole="button" className="app-button-primary flex-1" onPress={finishQuestionnaire}>
              <Text className="text-base font-bold text-on-brand">Finish</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="app-screen" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-12" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between pt-5">
          <Text className="text-2xl font-bold text-ink">Health questionnaire</Text>
          <Pressable accessibilityRole="button" onPress={leaveQuestionnaire}>
            <Text className="text-base font-bold text-brand-dark">Skip</Text>
          </Pressable>
        </View>
        <QuestionnaireProgress step={1} />
        <Text className="mt-3 text-3xl font-bold tracking-tight text-ink">Tell us about your health</Text>
        <Text className="app-body-copy mt-2">
          About 5 minutes. Your answers personalize glucose predictions during this session.
        </Text>

        <View className="app-card mt-6">
          <View className="flex-row items-center">
            <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-brand-soft">
              <Text className="font-bold text-brand-dark">1</Text>
            </View>
            <Text className="text-xl font-bold text-ink">About you</Text>
          </View>

          <View className="mt-6">
            <QuestionnaireField
              keyboardType="number-pad"
              label="Age"
              onChangeText={(age) => updateAnswers({ age })}
              placeholder="42"
              suffix="years"
              value={answers.age}
            />
          </View>
          <View className="mt-5 flex-row gap-4">
            <QuestionnaireField
              label="Height"
              onChangeText={(height) => updateAnswers({ height })}
              placeholder={'5\' 5"'}
              suffix="ft / in"
              value={answers.height}
            />
            <QuestionnaireField
              keyboardType="decimal-pad"
              label="Weight"
              onChangeText={(weight) => updateAnswers({ weight })}
              placeholder="150"
              suffix="lb"
              value={answers.weight}
            />
          </View>

          <Text className="mt-7 text-base font-semibold text-ink">Gender</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {genders.map((gender) => (
              <SelectionChip key={gender} label={gender} onPress={() => selectGender(gender)} selected={answers.gender === gender} />
            ))}
          </View>

          {answers.gender === 'Female' ? (
            <View className="mt-4 w-full self-stretch rounded-card bg-brand-soft p-4">
              <Text className="text-base font-semibold text-ink">Are you currently pregnant?</Text>
              <Text className="mt-1 text-sm leading-5 text-copy">Pregnancy changes glucose targets. Your care team will adjust guidance.</Text>
              <View className="mt-4 flex-row flex-wrap gap-2">
                {(['Yes', 'No', 'Not sure'] as const).map((status) => (
                  <SelectionChip
                    key={status}
                    label={status}
                    onPress={() => updateAnswers({ isPregnant: status })}
                    selected={answers.isPregnant === status}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <Text className="mt-7 text-base font-semibold text-ink">Ethnicity</Text>
          <Text className="mt-1 text-sm text-copy">Select all that apply</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {ethnicities.map((ethnicity) => (
              <SelectionChip
                key={ethnicity}
                label={ethnicity}
                onPress={() => updateAnswers({ ethnicity: toggleItem(answers.ethnicity, ethnicity as Ethnicity) })}
                selected={answers.ethnicity.includes(ethnicity as Ethnicity)}
              />
            ))}
          </View>
        </View>

        <Pressable accessibilityRole="button" className="app-button-primary mt-5" onPress={() => setStep(2)}>
          <Text className="text-base font-bold text-on-brand">Continue</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
