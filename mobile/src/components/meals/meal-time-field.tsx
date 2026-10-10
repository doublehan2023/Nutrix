import { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

type MealTimeFieldProps = {
  onChange: (time: Date) => void;
  value: Date;
};

function formatTime(time: Date) {
  return time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function MealTimeField({ onChange, value }: MealTimeFieldProps) {
  const [pickerVisible, setPickerVisible] = useState(false);

  function handleChange(_: unknown, selectedTime?: Date) {
    if (selectedTime) {
      onChange(selectedTime);
    }

    if (Platform.OS === 'android') {
      setPickerVisible(false);
    }
  }

  return (
    <View className="app-card flex-1">
      <Text className="app-card-title">Meal time</Text>
      <Pressable accessibilityRole="button" className="mt-3 rounded-card bg-canvas px-4 py-4" onPress={() => setPickerVisible(true)}>
        <Text className="text-lg font-semibold text-ink">{formatTime(value)}</Text>
      </Pressable>
      <Modal animationType="slide" onRequestClose={() => setPickerVisible(false)} transparent visible={pickerVisible && Platform.OS === 'ios'}>
        <View className="flex-1 justify-end bg-black/30">
          <View className="rounded-t-[28px] bg-surface p-5">
            <View className="flex-row items-center justify-between">
              <Text className="app-card-title">Meal time</Text>
              <Pressable accessibilityRole="button" onPress={() => setPickerVisible(false)}>
                <Text className="text-base font-bold text-brand-dark">Done</Text>
              </Pressable>
            </View>
            <DateTimePicker display="spinner" mode="time" onChange={handleChange} value={value} />
          </View>
        </View>
      </Modal>
      {pickerVisible && Platform.OS === 'android' ? (
        <DateTimePicker display="default" mode="time" onChange={handleChange} value={value} />
      ) : null}
    </View>
  );
}
