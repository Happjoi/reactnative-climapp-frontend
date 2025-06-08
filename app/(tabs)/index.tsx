import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  ActivityIndicator, 
  Image, 
  ScrollView, 
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import axios from 'axios';
import * as Location from 'expo-location';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { FontAwesome5 } from '@expo/vector-icons';

// IMPORTANTE: Substitua pelo IP da sua máquina
const API_URL = 'http://192.94.1.103:3001/weather';

export default function IndexScreen() {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastLocation, setLastLocation] = useState<Location.LocationObject | null>(null);
  const [watchPositionId, setWatchPositionId] = useState<Location.LocationSubscription | null>(null);
  const colorScheme = useColorScheme();

  // Função para buscar os dados do clima
  const fetchWeather = useCallback(async (latitude: number, longitude: number) => {
    try {
      console.log(`Buscando clima para: ${latitude}, ${longitude}`);
      
      const response = await axios.get(`${API_URL}?lat=${latitude}&lon=${longitude}`, {
        timeout: 5000
      });
      
      setWeather(response.data);
      setError(null);
      return true;
    } catch (err: any) {
      console.error('Erro ao buscar dados:', err);
      
      let errorMsg = 'Erro ao carregar dados do clima';
      if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      return false;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Obter localização e buscar clima
  const getLocationAndWeather = useCallback(async () => {
    setRefreshing(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setError('Permissão de localização negada!');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        // Distância mínima em metros para considerar uma nova localização
        distanceInterval: 1000 // 1km
      });
      
      // Atualizar apenas se a localização mudou significativamente
      if (!lastLocation || 
          Math.abs(location.coords.latitude - lastLocation.coords.latitude) > 0.01 ||
          Math.abs(location.coords.longitude - lastLocation.coords.longitude) > 0.01) {
        
        console.log('Nova localização detectada');
        setLastLocation(location);
        await fetchWeather(
          location.coords.latitude,
          location.coords.longitude
        );
      } else {
        console.log('Localização inalterada');
        setRefreshing(false);
      }
    } catch (err) {
      setError('Erro ao obter localização');
      console.error(err);
      setRefreshing(false);
    }
  }, [fetchWeather, lastLocation]);

  // Atualização manual
  const manualRefresh = () => {
    console.log('Atualização manual solicitada');
    getLocationAndWeather();
  };

  // Monitorar mudanças de localização
  const startWatchingPosition = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      // Configurar monitoramento de localização
      const id = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000, // 30 segundos
          distanceInterval: 500, // 500 metros
        },
        (newLocation) => {
          console.log('Mudança de localização detectada');
          setLastLocation(newLocation);
          fetchWeather(
            newLocation.coords.latitude,
            newLocation.coords.longitude
          );
        }
      );

      setWatchPositionId(id);
    } catch (err) {
      console.error('Erro ao iniciar monitoramento:', err);
    }
  }, [fetchWeather]);

  // Efeitos iniciais
  useEffect(() => {
    getLocationAndWeather();
    startWatchingPosition();

    // Limpar ao desmontar
    return () => {
      if (watchPositionId) {
        watchPositionId.remove();
      }
    };
  }, );

  // Pull-to-refresh
  const onRefresh = () => {
    getLocationAndWeather();
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.loadingText}>
          Obtendo dados climáticos...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors[colorScheme ?? 'light'].tint}
          />
        }
      >
        {error ? (
          <ThemedView style={styles.errorContainer}>
            <ThemedText type="title" style={styles.errorText}>{error}</ThemedText>
            <ThemedText style={styles.retryText}>
              Puxe para tentar novamente
            </ThemedText>
          </ThemedView>
        ) : weather && (
          <>
            <ThemedView style={styles.header}>
              <ThemedText type="title" style={styles.city}>{weather.city}</ThemedText>
              <TouchableOpacity onPress={manualRefresh} style={styles.refreshButton}>
                <FontAwesome5 name="sync" size={24} color={Colors[colorScheme ?? 'light'].tint} />
              </TouchableOpacity>
            </ThemedView>
            
            <Image
              style={styles.icon}
              source={{ uri: `https://openweathermap.org/img/wn/${weather.icon}@4x.png` }}
            />
            
            <ThemedText type="title" style={styles.temp}>{Math.round(weather.temp)}°C</ThemedText>
            <ThemedText style={styles.description}>
              {weather.description.charAt(0).toUpperCase() + weather.description.slice(1)}
            </ThemedText>
            
            <ThemedView style={styles.detailsCard}>
              <ThemedView style={styles.detailItem}>
                <ThemedText style={styles.detailLabel}>Sensação</ThemedText>
                <ThemedText style={styles.detailValue}>{Math.round(weather.feels_like)}°C</ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.detailItem}>
                <ThemedText style={styles.detailLabel}>Umidade</ThemedText>
                <ThemedText style={styles.detailValue}>{weather.humidity}%</ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.detailItem}>
                <ThemedText style={styles.detailLabel}>Vento</ThemedText>
                <ThemedText style={styles.detailValue}>{weather.wind} m/s</ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.detailItem}>
                <ThemedText style={styles.detailLabel}>Pressão</ThemedText>
                <ThemedText style={styles.detailValue}>{weather.pressure} hPa</ThemedText>
              </ThemedView>
            </ThemedView>
            
            <ThemedText style={styles.updateInfo}>
              Última atualização: {new Date().toLocaleTimeString()}
            </ThemedText>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  city: {
    fontSize: 32,
    fontWeight: 'bold',
    flex: 1,
  },
  refreshButton: {
    padding: 10,
  },
  icon: {
    width: 150,
    height: 150,
    marginVertical: 10,
    alignSelf: 'center',
  },
  temp: {
    fontSize: 60,
    fontWeight: 'bold',
    marginVertical: 5,
    textAlign: 'center',
  },
  description: {
    fontSize: 24,
    marginBottom: 30,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  detailsCard: {
    borderRadius: 20,
    padding: 20,
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  detailItem: {
    width: '48%',
    marginBottom: 15,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  retryText: {
    fontSize: 16,
    textAlign: 'center',
  },
  updateInfo: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginTop: 10,
  },
});