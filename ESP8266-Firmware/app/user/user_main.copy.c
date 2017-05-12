/******************************************************************************
 * Copyright 2015 Piotr Sperka (http://www.piotrsperka.info)
 * Copyright 2016 karawin (http://www.karawin.fr)
 *
 * FileName: user_main.c
 *
 * Description: entry file of user application
*******************************************************************************/
#include "esp_common.h"
#include "esp_softap.h"
#include "esp_wifi.h"
#include "esp_system.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/semphr.h"

#include "el_uart.h"

#include "lwip/sockets.h"
#include "lwip/dns.h"
#include "lwip/netdb.h"

#include "interface.h"
#include "webserver.h"
#include "webclient.h"
#include "buffer.h"
#include "extram.h"
#include "vs1053.h"

#include "eeprom.h"


void uart_div_modify(int no, unsigned int freq);

//	struct station_config config;
int FlashOn = 5,FlashOff = 5;
sc_status status = 0;
	
void cb(sc_status stat, void *pdata)
{
	printf("SmartConfig status received: %d\n",status);
	status = stat;
	if (stat == SC_STATUS_LINK_OVER) if (pdata) printf("SmartConfig: %d:%d:%d:%d\n",((char*) pdata)[0],((char*)pdata)[1],((char*)pdata)[2],((char*)pdata)[3]);
}

void uartInterfaceTask(void *pvParameters) {
	char tmp[255];
//	bool conn = false;
	uint8 ap = 0;
	int i = 0;	
	uint8 maxap;
	int uxHighWaterMark;
/*	uxHighWaterMark = uxTaskGetStackHighWaterMark( NULL );
	printf("watermark wsTask: %x  %d\n",uxHighWaterMark,uxHighWaterMark);
*/
	int t = 0;
	for(t = 0; t<sizeof(tmp); t++) tmp[t] = 0;
	t = 0;
	uart_rx_init();
	printf("UART READY TO READ\n");
	
//-------------------------
// AP Connection management
//-------------------------
	struct ip_info *info;
	struct device_settings *device;
	struct station_config* config;
//	wifi_station_set_auto_connect(false);
//	wifi_station_set_reconnect_policy(false);
	wifi_station_set_hostname("WifiWebRadio");
	wifi_station_ap_number_set(2); // only 	
	
	device = getDeviceSettings();
	config = malloc(sizeof(struct station_config));
	info = malloc(sizeof(struct ip_info));
	wifi_get_ip_info(STATION_IF, info);
//	wifi_station_get_config_default(config);
	if ((device->ssid[0] == 0xFF)&& (device->ssid2[0] == 0xFF) )  {eeEraseAll(); device = getDeviceSettings();} // force init of eeprom
	if (device->ssid2[0] == 0xFF) {device->ssid2[0] = 0; device->pass2[0] = 0; }
	printf("AP1: %s, AP2: %s\n",device->ssid,device->ssid2);
		
	if ((strlen(device->ssid)==0)||(device->ssid[0]==0xff)/*||(device->ipAddr[0] ==0)*/) // first use
	{
		printf("first use, set default\n");
		IP4_ADDR(&(info->ip), 192, 168, 1, 1);
		IP4_ADDR(&(info->netmask), 0xFF, 0xFF,0xFF, 0);
		IP4_ADDR(&(info->gw), 192, 168, 1, 254);
		IPADDR2_COPY(&device->ipAddr, &info->ip);
		IPADDR2_COPY(&device->mask, &info->netmask);
		IPADDR2_COPY(&device->gate, &info->gw);
//		strcpy(device->ssid,config->ssid);
//		strcpy(device->pass,config->password);
		device->dhcpEn = false;
		wifi_set_ip_info(STATION_IF, info);
		saveDeviceSettings(device);	
	}
	
		IP4_ADDR(&(info->ip), device->ipAddr[0], device->ipAddr[1],device->ipAddr[2], device->ipAddr[3]);
		IP4_ADDR(&(info->netmask), device->mask[0], device->mask[1],device->mask[2], device->mask[3]);
		IP4_ADDR(&(info->gw), device->gate[0], device->gate[1],device->gate[2], device->gate[3]);

		strcpy(config->ssid,device->ssid);
		strcpy(config->password,device->pass);
		wifi_station_set_config(config);
	
	if (!device->dhcpEn) {
//		if ((strlen(device->ssid)!=0)&&(device->ssid[0]!=0xff)&&(!device->dhcpEn))
//			conn = true;	//static ip
		wifi_station_dhcpc_stop();
		wifi_set_ip_info(STATION_IF, info);
	} 
	
	printf(" Station Ip: %d.%d.%d.%d\n",(info->ip.addr&0xff), ((info->ip.addr>>8)&0xff), ((info->ip.addr>>16)&0xff), ((info->ip.addr>>24)&0xff));

//	printf("DHCP: 0x%x\n Device: Ip: %d.%d.%d.%d\n",device->dhcpEn,device->ipAddr[0], device->ipAddr[1], device->ipAddr[2], device->ipAddr[3]);
//	printf("\nI: %d status: %d\n",i,wifi_station_get_connect_status());
//	wifi_station_set_auto_connect(true);
//	wifi_station_ap_change(ap);
	wifi_station_connect();
	i = 0;
	while ((wifi_station_get_connect_status() != STATION_GOT_IP))
	{	
		printf("Trying %s,  I: %d status: %d\n",config->ssid,i,wifi_station_get_connect_status());
		FlashOn = FlashOff = 40;

		vTaskDelay(400);//  ms
		if (( strlen(config->ssid) ==0)||  (wifi_station_get_connect_status() == STATION_WRONG_PASSWORD)||(wifi_station_get_connect_status() == STATION_CONNECT_FAIL)||(wifi_station_get_connect_status() == STATION_NO_AP_FOUND))
		{ 
			if ((strlen(device->ssid2) > 0)&& (ap <1))
			{
			strcpy(config->ssid,device->ssid2);
			strcpy(config->password,device->pass2);
			wifi_station_set_config(config);
			printf(" Status: %d\n",wifi_station_get_connect_status());
			ap++;
			}
			else i = 6;
		}
		i++;
	
		if (i >= 6)
		{
					printf("\n");
//					smartconfig_stop();
					FlashOn = 10;FlashOff = 200;
					vTaskDelay(200);
					printf("Config not found\n\n");
					saveDeviceSettings(device);	
					printf("The default AP is  WifiWebRadio. Connect your wifi to it.\nThen connect a webbrowser to 192.168.4.1 and go to Setting\n");
					printf("Erase the database and set ssid, password and ip's field\n");
					struct softap_config *apconfig;
					apconfig = malloc(sizeof(struct softap_config));
					if (apconfig == NULL) printf("apconfig malloc fails\n");
					wifi_softap_get_config(apconfig);
					memset(apconfig,0,sizeof(struct softap_config));
//					apconfig->max_connection = 4;
					strcpy (apconfig->ssid,"WifiWebRadio");
					apconfig->ssid_len = 12;					
					wifi_softap_set_config(apconfig);
					wifi_set_opmode_current(SOFTAP_MODE);

//					conn = true; 
					free(apconfig);
					break;
		}//

	}
	wifi_station_set_reconnect_policy(true);
	// update device info
	wifi_get_ip_info(STATION_IF, info);
//	wifi_station_get_config(config);
	IPADDR2_COPY(&device->ipAddr, &info->ip);
	IPADDR2_COPY(&device->mask, &info->netmask);
	IPADDR2_COPY(&device->gate, &info->gw);
//	strcpy(device->ssid,config->ssid);
//	strcpy(device->pass,config->password);
	saveDeviceSettings(device);			
//autostart	
	printf("autostart: playing:%d, currentstation:%d\n",device->autostart,device->currentstation);
	currentStation = device->currentstation;
	VS1053_I2SRate(device->i2sspeed);
	if (device->autostart ==1)
	{	
		vTaskDelay(100); //1000 ms
		playStationInt(device->currentstation);
	}
//
	free(info);
	free (device);
	free (config);
	if (system_adc_read() < 10)
	{
		adcdiv = 0; // no panel adc grounded
		printf("No control panel detected\n");
	}
	else
	// read adc to see if it is a nodemcu with adc dividor
		if (system_adc_read() < 400) adcdiv = 3;
			else adcdiv = 1;
	FlashOn = 190;FlashOff = 10;	
	while(1) {
		while(1) {
			int c = uart_getchar_ms(100);
			if (c!= -1)
			{
				if((char)c == '\r') break;
				if((char)c == '\n') break;
				tmp[t] = (char)c;
				t++;
				if(t == sizeof(tmp)) t = 0;
			}
			switchCommand() ;  // hardware panel of command
		}
		checkCommand(t, tmp);
//	uxHighWaterMark = uxTaskGetStackHighWaterMark( NULL );
//	printf("watermark:%d  heap:%d\n",uxHighWaterMark,xPortGetFreeHeapSize( ));
		
		for(t = 0; t<sizeof(tmp); t++) tmp[t] = 0;
		t = 0;
	}
}

UART_SetBaudrate(uint8 uart_no, uint32 baud_rate) {
	uart_div_modify(uart_no, UART_CLK_FREQ / baud_rate);
}

void testtask(void* p) {
	
//	gpio16_output_conf();
	gpio2_output_conf();
	vTaskDelay(50);
	while(1) {
//		gpio16_output_set(0);
		gpio2_output_set(0);
		vTaskDelay(FlashOff);
//		gpio16_output_set(1);
		gpio2_output_set(1);
		vTaskDelay(FlashOn);
	};
}
/******************************************************************************
 * FunctionName : user_rf_cal_sector_set
 * Description  : SDK just reversed 4 sectors, used for rf init data and paramters.
 *                We add this function to force users to set rf cal sector, since
 *                we don't know which sector is free in user's application.
 *                sector map for last several sectors : ABCCC
 *                A : rf cal
 *                B : rf init data
 *                C : sdk parameters
 * Parameters   : none
 * Returns      : rf cal sector
*******************************************************************************/
uint32 user_rf_cal_sector_set(void)
{
    flash_size_map size_map = system_get_flash_size_map();
    uint32 rf_cal_sec = 0;

    switch (size_map) {
        case FLASH_SIZE_4M_MAP_256_256:
            rf_cal_sec = 128 - 5;
            break;

        case FLASH_SIZE_8M_MAP_512_512:
            rf_cal_sec = 256 - 5;
            break;

        case FLASH_SIZE_16M_MAP_512_512:
        case FLASH_SIZE_16M_MAP_1024_1024:
            rf_cal_sec = 512 - 5;
            break;

        case FLASH_SIZE_32M_MAP_512_512:
        case FLASH_SIZE_32M_MAP_1024_1024:
            rf_cal_sec = 1024 - 5;
            break;

        default:
            rf_cal_sec = 0;
            break;
    }

    return rf_cal_sec;
}
/******************************************************************************
 * FunctionName : test_upgrade
 * Description  : check if it is an upgrade. Convert if needed
 * Parameters   : none
 * Returns      : none
*******************************************************************************/
void test_upgrade(void)
{
	uint8 autotest;
	struct device_settings *settings;
	struct shoutcast_info* station;
	int j;
	eeGetOldData(0x0C070, &autotest, 1);
	if (autotest == 3) // old bin before 1.0.6
	{
		autotest = 0; //patch espressif 1.4.2 see http://bbs.espressif.com/viewtopic.php?f=46&t=2349
		eeSetOldData(0x0C070, &autotest, 1);
		settings = getOldDeviceSettings();
		saveDeviceSettings(settings);
		free(settings);
		eeEraseStations();
		for(j=0; j<192; j++){
			station = getOldStation(j) ;	
			saveStation(station, j);
			free(station);			
			vTaskDelay(1); // avoid watchdog
		}
	}		
}
/******************************************************************************
 * FunctionName : checkUart
 * Description  : Check for a valid uart baudrate
 * Parameters   : baud
 * Returns      : baud
*******************************************************************************/
uint32_t checkUart(uint32_t speed)
{
	uint32_t valid[] = {1200,2400,4800,9600,14400,19200,28800,38400,57600,76880,115200,230400};
	int i = 0;
	for (i;i<12;i++){
		if (speed == valid[i]) return speed;
	}
	return 115200; // default
}
/******************************************************************************
 * FunctionName : user_init
 * Description  : entry of user application, init user function here
 * Parameters   : none
 * Returns      : none
*******************************************************************************/
void user_init(void)
{
	struct device_settings *device;
	uint32_t uspeed;
//	REG_SET_BIT(0x3ff00014, BIT(0));
//	system_update_cpu_freq(SYS_CPU_160MHZ);
//	system_update_cpu_freq(160); //- See more at: http://www.esp8266.com/viewtopic.php?p=8107#p8107

	xTaskHandle pxCreatedTask;
    Delay(300);
	device = getDeviceSettings();
	uspeed = device->uartspeed;
	free(device);
	uspeed = checkUart(uspeed);
	UART_SetBaudrate(0,uspeed);
	VS1053_HW_init(); // init spi
	test_upgrade();
	extramInit();
	initBuffer();
	wifi_set_opmode(STATION_MODE);
	Delay(100);	
	system_print_meminfo();
	printf ("Heap size: %d\n",xPortGetFreeHeapSize( ));
	clientInit();
//	VS1053_HW_init();
	Delay(100);	

	xTaskCreate(testtask, "t0", 80, NULL, 1, &pxCreatedTask); // DEBUG/TEST 80
	printf("t0 task: %x\n",pxCreatedTask);
	xTaskCreate(uartInterfaceTask, "t1", 320, NULL, 6, &pxCreatedTask); // 244
	printf("t1 task: %x\n",pxCreatedTask);
	xTaskCreate(vsTask, "t4", 370, NULL,4, &pxCreatedTask); //370
	printf("t4 task: %x\n",pxCreatedTask);
	xTaskCreate(clientTask, "t3", 830, NULL, 5, &pxCreatedTask); // 830
	printf("t3 task: %x\n",pxCreatedTask);
	xTaskCreate(serverTask, "t2", 230, NULL, 3, &pxCreatedTask); //230
	printf("t2 task: %x\n",pxCreatedTask);

}

