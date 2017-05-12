/*
 * Copyright 2016 karawin (http://www.karawin.fr)
*/

#include "webclient.h"
#include "webserver.h"

#include "lwip/sockets.h"
#include "lwip/api.h"
#include "lwip/netdb.h"

#include "esp_common.h"

#include "freertos/semphr.h"

#include "vs1053.h"
#include "eeprom.h"
#include "buffer.h"

static enum clientStatus cstatus;
//static uint32_t metacount = 0;
//static uint16_t metasize = 0;

extern bool ledStatus;

xSemaphoreHandle sConnect, sConnected, sDisconnect, sHeader;

static uint8_t connect = 0,once = 0;
static uint8_t volume = 0;
uint8_t playing = 0;

char notfound[]={"Not Found"};
char strplaying[]={"##CLI.PLAYING#\n"};

/* TODO:
	- METADATA HANDLING
	- IP SETTINGS
	- VS1053 - DELAY USING vTaskDelay
*/
struct icyHeader header = {NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL};

char metaint[10];
char clientURL[256]= {0,0};
char clientPath[256] = {0,0};
uint16_t clientPort = 80;


struct hostent *server = NULL;


void *incmalloc(size_t n)
{
	void* ret;
//printf ("Client malloc of %d,  Heap size: %d\n",n,xPortGetFreeHeapSize( ));
	ret = malloc(n);
		if (ret == NULL) printf("Client: incmalloc fails for %d\n",n);
//	if (n <4) printf("Client: incmalloc size:%d\n",n);	
//	printf ("Client malloc after of %d bytes ret:%x  Heap size: %d\n",n,ret,xPortGetFreeHeapSize( ));
	return ret;
}	
void incfree(void *p,char* from)
{
	if (p != NULL) free(p);
//	printf ("Client incfree of %x, from %s           Heap size: %d\n",p,from,xPortGetFreeHeapSize( ));
}	

ICACHE_FLASH_ATTR void clientPrintState()
{
	if (playing)
		printf(strplaying);
	else
		printf("##CLI.STOPPED# from %s\n","State");
}
ICACHE_FLASH_ATTR void clientInit() {
	vSemaphoreCreateBinary(sHeader);
	vSemaphoreCreateBinary(sConnect);
	vSemaphoreCreateBinary(sConnected);
	vSemaphoreCreateBinary(sDisconnect);
	xSemaphoreTake(sConnect, portMAX_DELAY);
	xSemaphoreTake(sConnected, portMAX_DELAY);
	xSemaphoreTake(sDisconnect, portMAX_DELAY);
}

ICACHE_FLASH_ATTR uint8_t clientIsConnected() {
	if(xSemaphoreTake(sConnected, 0)) {
		xSemaphoreGive(sConnected);
		return 0;
	}
	return 1;
}
ICACHE_FLASH_ATTR void dump(uint8_t* from, uint32_t len )
{
	uint32_t i = 0;
	uint8_t* addr ;
	addr =  from;
	for (i;i<len;i+=16){
		printf("\n%x %02x %02x %02x %02x %02x %02x %02x %02x %02x %02x %02x %02x %02x %02x %02x %02x ",addr,addr[0],addr[1],addr[2],addr[3],addr[4],addr[5],addr[6],addr[7],addr[8],addr[9],addr[10],addr[11],addr[12],addr[13],addr[14],addr[15]);
		addr+=16;
	}	
	printf("\n");
}
ICACHE_FLASH_ATTR struct icyHeader* clientGetHeader()
{	
	return &header;
}

	
ICACHE_FLASH_ATTR bool clientParsePlaylist(char* s)
{
  char* str;
  char* ns; 
  char path[255] = "/";
  char url[78]; 
  char port[5] = "80";
  int remove = 0;
  int i = 0; int j = 0;
  
// for extm3u skip line with #EXTINF  
  str = strstr(s,"#EXTINF");
  if (str != NULL) //skip to next line
  {
	ns = str;
    while ((strlen(ns) > 1) && (ns[0]!=0x0A)) ns++;
//	printf("EXTM3U: %s\n",ns);
	s= ns;
  }
  str = strstr(s,"<location>http://");  //for xspf
  if (str != NULL) remove = 17;
  if (str ==NULL) 
  {	  
	str = strstr(s,"http://");
	if (str != NULL) remove = 7;
  }
  if (str ==NULL) 
  {	  
	str = strstr(s,"https://");
	if (str != NULL) remove = 8;
  } 
  if (str != NULL) 
  
  {
	str += remove; //skip http://
	
//	printf("parse str %s\n",str);
	
	while ((str[i] != '/')&&(str[i] != ':')&&(str[i] != 0x0a)&&(str[i] != 0x0d)&&(j<78)) {url[j] = str[i]; i++ ;j++;}
	url[j] = 0;
//	printf("parse str url %s\n",url);
	j = 0;
	if (str[i] == ':')  //port
	{
		i++;
		while ((str[i] != '/')&&(str[i] != 0x0a)&&(str[i] != 0x0d)) {port[j] = str[i]; i++ ;j++;}
	}
	j = 0;
	if ((str[i] != 0x0a)&&(str[i] != 0x0d)&&(str[i] != 0)&&(str[i] != '"')&&(str[i] != '<'))
	{	
	  while ((str[i] != 0x0a)&&(str[i] != 0x0d)&&(str[i] != 0)&&(str[i] != '"')&&(str[i] != '<')&&(j<255)) {path[j] = str[i]; i++; j++;}
	  path[j] = 0;
	}
	
	
	
	if (strncmp(url,"localhost",9)!=0) clientSetURL(url);
	clientSetPath(path);
	clientSetPort(atoi(port));
//printf("##CLI.URL#: %s, path: %s, port: %s\n",url,path,port);
	return true;
  }
  else 
  { 
   cstatus = C_DATA;
   return false;
  }
}
ICACHE_FLASH_ATTR char* stringify(char* str,int len)
{
//		if ((strchr(str,'"') == NULL)&&(strchr(str,'/') == NULL)) return str;
		char* new = incmalloc(len+10);
		if (new != NULL)
		{
//			printf("stringify: enter: len:%d  \"%s\"\n",len,str);
			int i=0 ,j =0;
			for (i = 0;i< len+10;i++) new[i] = 0;
			for (i=0;i< len;i++)
			{
				if (str[i] == '"') {
					new[j++] = '\\';
					new[j++] =(str)[i] ;
				} else
				if (str[i] == '/') {
					new[j++] = '\\';
					new[j++] =(str)[i] ;
				}else	// pseudo ansi utf8 convertion
					if ((str[i] > 192) && (str[i+1] < 0x80)){ // 128 = 0x80
					new[j++] = 195; // 192 = 0xC0   195 = 0xC3
					new[j++] =(str)[i]-64 ; // 64 = 0x40
				} else new[j++] =(str)[i] ;
			}
			incfree(str,"str");
			new = realloc(new,j+1);
//			printf("stringify: exit: len:%d  \"%s\"\n",j,new);
			return new;		
		} else 
		{
			printf("stringify malloc fails\n");
		}	
		return str;
}

ICACHE_FLASH_ATTR bool clientPrintMeta()
{
	printf("##CLI.META#: %s\n",header.members.mArr[METADATA]); 
}
// A metadata found. Extract the Stream title
ICACHE_FLASH_ATTR void clientSaveMetadata(char* s,int len)
{
		char* t_end = NULL;
		char* t ;
		bool found = false;
		if (len > 256) return;
		t = s;
		t_end = strstr(t,";StreamUrl='");
		if (t_end != NULL) { *t_end = 0;found = true;} 
		t = strstr(t,"StreamTitle='");
		if (t!= NULL) {t += 13;found = true;} else t = s;
		len = strlen(t);
		if ((t_end != NULL)&&(len >=3)) t_end -= 3;
		else {
			if (t_end != NULL) t_end -=1;
			else
			if (len >=2) {t_end = t+len-2;found = true;} 
			else t_end = t+len;
		}
		if (found)
		{	
			t_end = strstr(t_end,"'");
			if (t_end !=NULL)	 *t_end = 0;
		}
		else
		{
			if (len >=2) len-=2; 
		}

		if (header.members.mArr[METADATA] != NULL)
			incfree(header.members.mArr[METADATA],"metad");
		header.members.mArr[METADATA] = (char*)incmalloc((len+3)*sizeof(char));
		if(header.members.mArr[METADATA] == NULL) 
			{printf("clientsaveMeta malloc fails\n");
			return;}

		strcpy(header.members.mArr[METADATA], t);
//		dump((uint8_t*)(header.members.mArr[METADATA]),strlen(header.members.mArr[METADATA]));
		header.members.mArr[METADATA] = stringify(header.members.mArr[METADATA],len);
//		dump((uint8_t*)(header.members.mArr[METADATA]),strlen(header.members.mArr[METADATA]));
		clientPrintMeta(); 
		while ((header.members.mArr[METADATA][strlen(header.members.mArr[METADATA])-1] == ' ')||
			(header.members.mArr[METADATA][strlen(header.members.mArr[METADATA])-1] == '\r')||
		(header.members.mArr[METADATA][strlen(header.members.mArr[METADATA])-1] == '\n')
		)
		{
			header.members.mArr[METADATA][strlen(header.members.mArr[METADATA])-1] = 0; // avoid blank at end
		}	

// send station name if no metadata
		if (strlen(header.members.mArr[METADATA])!=0)			
			t_end = header.members.mArr[METADATA];
		else	
			t_end = (header.members.single.name ==NULL)?"":header.members.single.name;
		char* title = incmalloc(strlen(t_end)+15);
		if (title != NULL)
		{
			sprintf(title,"{\"meta\":\"%s\"}",t_end); 
			websocketbroadcast(title, strlen(title));
			incfree(title,"title");
		} else printf("clientsaveMeta malloc title fails\n"); 
}	

// websocket: next station
ICACHE_FLASH_ATTR void wsStationNext()
{
	struct shoutcast_info* si =NULL;
	do {
		++currentStation;
		if (currentStation >= 255)
			currentStation = 0;
		if (si != NULL) incfree(si,"wsstation");
		si = getStation(currentStation);	
	}
	while (si == NULL || ((si != NULL)&&(strcmp(si->domain,"")==0)) || ((si != NULL)&&(strcmp( si->file,"")== 0)));

	playStationInt	(currentStation);
	incfree(si,"wsstation");
}
// websocket: previous station
ICACHE_FLASH_ATTR void wsStationPrev()
{
	struct shoutcast_info* si = NULL;
	do {
		if (currentStation >0)
		{	
			if (si != NULL) incfree(si,"wsstation");
			si = getStation(--currentStation);
		}	
		else return;
	}
	while (si == NULL || ((si != NULL)&&(strcmp(si->domain,"")==0)) || ((si != NULL)&&(strcmp( si->file,"")== 0)));

	playStationInt	(currentStation);
	incfree(si,"wsstation");
}

// websocket: broadcast volume to all client
ICACHE_FLASH_ATTR void wsVol(char* vol)
{
	char answer[21];
	if (vol != NULL)
	{	
		sprintf(answer,"{\"wsvol\":\"%s\"}",vol);
		websocketbroadcast(answer, strlen(answer));
	} 
}	
// websocket: broadcast monitor url
ICACHE_FLASH_ATTR void wsMonitor()
{
		char answer[300];
		memset(&answer,0,300);
		if ((clientPath[0]!= 0))
		{
			sprintf(answer,"{\"monitor\":\"http://%s:%d%s\"}",clientURL,clientPort,clientPath);
			websocketbroadcast(answer, strlen(answer));
		}
}						
//websocket: broadcast all icy and meta info to web client.
ICACHE_FLASH_ATTR void wsHeaders()
{
	uint8_t header_num;
	char currentSt[5]; sprintf(currentSt,"%d",currentStation);
	char* not2;
	not2 = header.members.single.notice2;
	if (not2 ==NULL) not2=header.members.single.audioinfo;
	if ((header.members.single.notice2 != NULL)&(strlen(header.members.single.notice2)==0)) not2=header.members.single.audioinfo;

	int json_length ;
	json_length =104+ //93
		strlen(currentSt)+
		((header.members.single.description ==NULL)?0:strlen(header.members.single.description)) +
		((header.members.single.name ==NULL)?0:strlen(header.members.single.name)) +
		((header.members.single.bitrate ==NULL)?0:strlen(header.members.single.bitrate)) +
		((header.members.single.url ==NULL)?0:strlen(header.members.single.url))+ 
		((header.members.single.notice1 ==NULL)?0:strlen(header.members.single.notice1))+
		((not2 ==NULL)?0:strlen(not2))+
		((header.members.single.genre ==NULL)?0:strlen(header.members.single.genre))+
		((header.members.single.metadata ==NULL)?0:strlen(header.members.single.metadata))
		;
	char* wsh = incmalloc(json_length+1);
	if (wsh == NULL) {printf("wsHeader malloc fails\n");return;}

	sprintf(wsh,"{\"wsicy\":{\"curst\":\"%s\",\"descr\":\"%s\",\"meta\":\"%s\",\"name\":\"%s\",\"bitr\":\"%s\",\"url1\":\"%s\",\"not1\":\"%s\",\"not2\":\"%s\",\"genre\":\"%s\"}}",
			currentSt,
			(header.members.single.description ==NULL)?"":header.members.single.description,
			(header.members.single.metadata ==NULL)?"":header.members.single.metadata,	
			(header.members.single.name ==NULL)?"":header.members.single.name,
			(header.members.single.bitrate ==NULL)?"":header.members.single.bitrate,
			(header.members.single.url ==NULL)?"":header.members.single.url,
			(header.members.single.notice1 ==NULL)?"":header.members.single.notice1,
			(not2 ==NULL)?"":not2 ,
			(header.members.single.genre ==NULL)?"":header.members.single.genre); 
//	printf("WSH: len:%d  \"%s\"\n",strlen(wsh),wsh);
	websocketbroadcast(wsh, strlen(wsh));	
	incfree (wsh,"wsh");
}	

//Clear all ICY and META infos
ICACHE_FLASH_ATTR void clearHeaders()
{
	uint8_t header_num;
	for(header_num=0; header_num<ICY_HEADER_COUNT; header_num++) {
		if(header_num != METAINT) 
			if(header.members.mArr[header_num] != NULL) {
			header.members.mArr[header_num][0] = 0;				
		}
	}
	header.members.mArr[METAINT] = 0;
	wsHeaders();
}
	
ICACHE_FLASH_ATTR bool clientPrintOneHeader(uint8_t header_num)
{
	printf("##CLI.ICY%d#: %s\n",header_num,header.members.mArr[header_num]);
}

ICACHE_FLASH_ATTR bool clientPrintHeaders()
{
	uint8_t header_num;
	for(header_num=0; header_num<ICY_HEADER_COUNT; header_num++) {
		if((header_num != METAINT) && (header_num != METADATA))
			if(header.members.mArr[header_num] != NULL) {
				printf("##CLI.ICY%d#: %s\n",header_num,header.members.mArr[header_num]);
			}	
	}
	clientPrintMeta();	
}	

ICACHE_FLASH_ATTR bool clientSaveOneHeader(char* t, uint16_t len, uint8_t header_num)
{
	if(header.members.mArr[header_num] != NULL) 
		incfree(header.members.mArr[header_num],"headernum");
	header.members.mArr[header_num] = incmalloc((len+1)*sizeof(char));
	if(header.members.mArr[header_num] == NULL)
	{
		printf("clientSaveOneHeader malloc fails\n");
		return false;
	}	
	int i;
	for(i = 0; i<len+1; i++) header.members.mArr[header_num][i] = 0;
	strncpy(header.members.mArr[header_num], t, len);
	header.members.mArr[header_num] = stringify(header.members.mArr[header_num],len);
	vTaskDelay(10);
	clientPrintOneHeader(header_num);
//	printf("header after num:%d addr:0x%x  cont:\"%s\"\n",header_num,header.members.mArr[header_num],header.members.mArr[header_num]);
	return true;
}

	
ICACHE_FLASH_ATTR bool clientParseHeader(char* s)
{
	// icy-notice1 icy-notice2 icy-name icy-genre icy-url icy-br
	uint8_t header_num;
	bool ret = false;
//	printf("ParseHeader: %s\n",s);
	xSemaphoreTake(sHeader,portMAX_DELAY);
	if ((cstatus != C_HEADER1)&& (cstatus != C_PLAYLIST))// not ended. dont clear
	{
		clearHeaders();
	}
	for(header_num=0; header_num<ICY_HEADERS_COUNT; header_num++)
	{
//				printf("icy deb: %d\n",header_num);		
		char *t;
		t = strstr(s, icyHeaders[header_num]);
		if( t != NULL )
		{
			t += strlen(icyHeaders[header_num]);
			char *t_end = strstr(t, "\r\n");
			if(t_end != NULL)
			{
//				printf("icy in: %d\n",header_num);		
				uint16_t len = t_end - t;
				if(header_num != METAINT) // Text header field
				{
					ret = clientSaveOneHeader(t, len, header_num);
				}
				else // Numerical header field
				{					
						int i;
						for(i = 0; i<len+1; i++) metaint[i] = 0;
						strncpy(metaint, t, len);
						header.members.single.metaint = atoi(metaint);
//						printf("len = %d,MetaInt= %s, Metaint= %d\n",len, metaint,header.members.single.metaint);
						ret = true;
//						printf("icy: %s, %d\n",icyHeaders[header_num],header.members.single.metaint);					
				}
			}
		}
	}
	if (ret == true) {wsHeaders();wsMonitor();}
	xSemaphoreGive(sHeader);
		return ret;
}


ICACHE_FLASH_ATTR void clientSetName(char* name,uint16_t index)
{
	printf("##CLI.NAMESET#: %d %s\n",index,name);
}
ICACHE_FLASH_ATTR void clientSetURL(char* url)
{
	int l = strlen(url)+1;
	if (url[0] == 0xff) return; // wrong url

	strcpy(clientURL, url);
	printf("##CLI.URLSET#: %s\n",clientURL);
}

ICACHE_FLASH_ATTR void clientSetPath(char* path)
{
	int l = strlen(path)+1;
	if (path[0] == 0xff) return; // wrong path
	strcpy(clientPath, path);
	printf("##CLI.PATHSET#: %s\n",clientPath);
}

ICACHE_FLASH_ATTR void clientSetPort(uint16_t port)
{
	clientPort = port;
	printf("##CLI.PORTSET#: %d\n",port);
}


ICACHE_FLASH_ATTR void clientConnect()
{
	cstatus = C_HEADER;
	once = 0;
	if((server = (struct hostent*)gethostbyname(clientURL))) {
		xSemaphoreGive(sConnect);
	} else {
		clientDisconnect("clientConnect");
	}
}
ICACHE_FLASH_ATTR void clientConnectOnce()
{
	cstatus = C_HEADER;
	once = 1; // play one time
	if((server = (struct hostent*)gethostbyname(clientURL))) {
		xSemaphoreGive(sConnect);
	} else {
		clientDisconnect("clientConnectOnce");
	}
}
ICACHE_FLASH_ATTR void clientSilentConnect()
{
	cstatus = C_HEADER;
	once = 0;
	if(server != NULL) {
		xSemaphoreGive(sConnect);
	} else {
		clientSilentDisconnect();
	}
}
ICACHE_FLASH_ATTR void clientSilentDisconnect()
{
	xSemaphoreGive(sDisconnect);
}

ICACHE_FLASH_ATTR void clientDisconnect(char* from)
{
	//connect = 0;
	xSemaphoreGive(sDisconnect);
	printf("##CLI.STOPPED# from %s\n",from);
	if (!ledStatus) gpio2_output_set(1);
	vTaskDelay(10);
//	clearHeaders();
}

IRAM_ATTR void clientReceiveCallback(int sockfd, char *pdata, int len)
{
	static int metad ;
	static int rest ;
	static uint32_t chunked;
	static uint32_t cchunk;
	static char* metadata = NULL;
	uint16_t l ;
	uint32_t lc;
	char *inpdata;
	char* inpchr;
	uint32_t clen;
	char* t1;
	char* t2;
	bool  icyfound;

//	if (cstatus != C_DATA) {printf("cstatus= %d\n",cstatus);  printf("Len=%d, Byte_list = %s\n",len,pdata);}
	if (cstatus != C_DATA)
	{
		t1 = strstr(pdata, "404"); 
		if (t1 != NULL) t1 = strstr(pdata, notfound); 
		if (t1 != NULL) { // 
			printf(notfound);
			printf("\n");
			clientSaveOneHeader(notfound, 13,METANAME);
			wsHeaders();
			vTaskDelay(200);
			clientDisconnect("C_DATA");
			cstatus = C_HEADER;
			return;
		}	
	}	
	switch (cstatus)
	{
	case C_PLAYLIST:
         if (!clientParsePlaylist(pdata)) //need more
		  cstatus = C_PLAYLIST1;
		else {clientDisconnect("C_PLAYLIST");  }
    break;
	case C_PLAYLIST1:
       clientDisconnect("C_PLAYLIST1");	   
        clientParsePlaylist(pdata) ;//more?
		cstatus = C_PLAYLIST;
	break;
	case C_HEADER0:
	case C_HEADER:
		clearHeaders();
		metad = -1;	
		t1 = strstr(pdata, "302 "); 
		if (t1 ==NULL) t1 = strstr(pdata, "301 "); 
		if (t1 != NULL) { // moved to a new address
			if( strcmp(t1,"Found")||strcmp(t1,"Temporarily")||strcmp(t1,"Moved"))
			{
				printf("Header: Moved\n");
				clientDisconnect("C_HEADER");
				clientParsePlaylist(pdata);
				cstatus = C_PLAYLIST;				
			}	
			break;
		}
		//no break here
	case C_HEADER1:  // not ended
		{
			cstatus = C_HEADER1;
			do {
				t1 = strstr(pdata, "\r\n\r\n"); // END OF HEADER
//	printf("Header len: %d,  Header: %s\n",len,pdata);
				if ((t1 != NULL) && (t1 <= pdata+len-4)) 
				{
						t2 = strstr(pdata, "Internal Server Error"); 
						if (t2 != NULL)
						{
							printf("Internal Server Error\n");
							clientDisconnect("Internal Server Error");
							cstatus = C_HEADER;
							
						}
						icyfound = clientParseHeader(pdata);
						wsMonitor();											
/*						if(header.members.single.bitrate != NULL) 
							if (strcmp(header.members.single.bitrate,"320")==0)
								 system_update_cpu_freq(SYS_CPU_160MHZ);
							else system_update_cpu_freq(SYS_CPU_80MHZ);*/
						if(header.members.single.metaint > 0) 
							metad = header.members.single.metaint;
//	printf("t1: 0x%x, cstatus: %d, icyfound: %d  metad:%d Metaint:%d\n", t1,cstatus, icyfound,metad, header.members.single.metaint); 
						cstatus = C_DATA;	// a stream found
//						VS1053_flush_cancel(0);
//						VS1053_flush_cancel(1);
						t2 = strstr(pdata, "Transfer-Encoding: chunked"); // chunked stream? 
//						t2 = NULL;
						chunked = 0;
						t1+= 4; 
						if ( t2 != NULL) 
						{
							while (len -(t1-pdata)<8) {len += recv(sockfd, pdata+len, RECEIVE+8-len, 0); }
							chunked = (uint32_t) strtol(t1, NULL, 16) +2;
							if (strchr((t1),0x0A) != NULL)
								*strchr(t1,0x0A) = 0;
							
//	printf("chunked: %d,  strlen: %d  \"%s\"\n",chunked,strlen(t1)+1,t1);
							t1 +=strlen(t1)+1; //+1 for char 0, 
						}
						
						int newlen = len - (t1-pdata) ;
						cchunk = chunked;
//	printf("newlen: %d   len: %d   chunked:%d  pdata:%x \n",newlen,len,chunked,pdata);
						if(newlen > 0) clientReceiveCallback(sockfd,t1, newlen);
				} else
				{
					t1 = NULL;
					len += recv(sockfd, pdata+len, RECEIVE-len, 0);
				}
			} while (t1 == NULL);
		}
	break;
	default:		
// -----------	

// Chunk computing
		lc = len; // lc rest after chunk
//	 printf("CDATAIN: chunked: %d, cchunk: %d, len: %d\n",chunked,cchunk,len);
		if((chunked != 0)&&((cchunk ==0)||(len >= cchunk-1)))  //if in chunked mode and chunk received or complete in data
		{
//	 printf("CDATA1: chunked: %d, cchunk: %d, len: %d\n",chunked,cchunk,len);
			if (len == cchunk) // if a complete chunk in pdata, remove crlf
			{ 
				len -= 2;
				cchunk = 0;
//	printf("lenoe:%d, chunked:%d  cchunk:%d, lc:%d, metad:%d\n",len,chunked,cchunk, lc,metad );
			} else  // an incomplete chunk in progress
			{	
				if (len == cchunk-1) // missing lf: remove cr only, wait lf in next data
				{ 
					len -= 1;
					cchunk = 1;
//	printf("leno1:%d, chunked:%d  cchunk:%d, lc:%d, metad:%d\n",len,chunked,cchunk, lc,metad );
				} 				
				else		// a part of end of chunk 	and beginnining of a new one
				{
					inpdata = pdata;
					
					while (lc != 0)
					{					
						while (lc < cchunk+9) 
						{
							clen = recv(sockfd, pdata+len, 9, 0); 
							lc+=clen;len+=clen;
//	printf("more:%d, lc:%d\n",clen,lc);
						} //security to be sure to receive the new length
						
//	printf("leni0:%d, inpdata:%x, chunked:%d  cchunk:%d, lc:%d, \n",len,inpdata,chunked,cchunk, lc );
						inpchr=strchr(inpdata+cchunk,0x0D) ;
						if ((inpchr != NULL) &&(inpchr- (inpdata+cchunk) <16))
							*inpchr = 0; // replace lf by a end of string
						else {
/*							printf("0D not found\n");
							printf("len:%d, inpdata:%x, pdata:%x,chunked:%d  cchunk:%d, lc:%d, str:%s\n",len,inpdata,pdata,chunked,cchunk, lc,inpdata+cchunk );*/
							clientDisconnect("chunk"); clientConnect();
							lc = 0; 
							break;
						}
						chunked = (uint32_t) strtol(inpdata+cchunk, NULL, 16)+2;  // new chunk lenght including cr lf
						clen = strlen(inpdata+cchunk)  +2;
						lc = lc -cchunk  -clen; // rest after
//	printf("leni:%d, inpdata:%x, chunked:%d  cchunk:%d, lc:%d, clen:%d, str: %s\n",len,inpdata,chunked,cchunk, lc,clen,inpdata+cchunk );
						// compact data without chunklen and crlf
						if (cchunk >1){
							memcpy (inpdata+cchunk-2,pdata+len-lc, lc); 
//	printf("lenm:%d, inpdata:%x, chunked:%d  cchunk:%d, lc:%d\n",len,inpdata,chunked,cchunk, lc);
							len -= (clen +2);
							inpdata +=   (cchunk -2);
//	printf("memcpy1 at %x from %x, lc:%d\n",inpdata+cchunk-2,pdata+len-lc,lc);
						}
						else{
							memcpy (inpdata,inpdata+cchunk+clen, lc); 
//	printf("lenm:%d, inpdata:%x, chunked:%d  cchunk:%d, lc:%d\n",len,inpdata,chunked,cchunk, lc);
							len -= (clen + cchunk);							
//	printf("memcpy2 at %x from %x, lc:%d, len:%d\n",inpdata,inpdata+cchunk+clen,lc,len);
						}

						if (chunked > lc)
						{						
							cchunk = chunked - lc ;
							if (cchunk ==1) len --;
							if (cchunk ==0) len -=2;
							lc = 0;
						}	
						else
						{
							cchunk = chunked;
						}	
//	printf("leniout:%d, inpdata:%x, chunked:%d  cchunk:%d, lc:%d, metad:%d  clen:%d \n",len,inpdata,chunked,cchunk, lc,metad,clen );				
					}
				}
			}
		} 
		else 
		{
			if (chunked != 0) cchunk -= len; 
			lc = 0;
		}
		
// printf("CDATAOUT: chunked: %d, cchunk: %d, len: %d\n",chunked,cchunk,len);
		
// meta data computing
		if (rest <0) 
		{
//	printf("Negative len= %d, metad= %d  rest= %d   pdata= \"%s\"\n",len,metad,rest,pdata);
			strncat(metadata,pdata,0-rest);
			clientSaveMetadata(metadata,strlen(metadata));
			len += rest;
			metad = header.members.single.metaint ;
			pdata -= rest;
//	printf("Negative len out = %d, metad= %d  rest= %d \n",len,metad,rest);
			rest = 0;
		}
		inpdata = pdata;
		clen = len;
		if((header.members.single.metaint != 0)&&(clen > metad)) 
		{
//	printf("metain len:%d, clen:%d, metad:%d, l:%d, inpdata:%x, rest:%d\n",len,clen,metad, l,inpdata,rest );
int jj = 0;
			while ((clen > metad)&&(header.members.single.metaint != 0)) // in buffer
			{
				jj++;
				l = inpdata[metad]*16;
				rest = clen - metad  -l -1;
/*	if (l !=0)
	printf("mt len:%d, clen:%d, metad:%d ,&l:%x, l:%d, rest:%d, str: %s\n",len,clen,metad,inpdata+metad, l,rest,inpdata+metad+1 );
	else
	printf("mt len:%d, clen:%d, metad:%d,&l:%x, l:%d, rest:%d\n",len,clen,metad,inpdata+metad, l,rest );
	if (l > 200) dump(inpdata,len);
*/	
				if (l !=0)
				{
					if (rest <0)
					{
						*(inpdata+clen) = 0; //truncated
						
						if (metadata != NULL) incfree(metadata,"meta"); 
						metadata = incmalloc(l+1);	
						strcpy(metadata,inpdata+metad+1);
					}
					else clientSaveMetadata(inpdata+metad+1,l);
				}				
				while(getBufferFree() < metad)	vTaskDelay(1);
				if (metad >0) bufferWrite(inpdata, metad); 
				metad  = header.members.single.metaint;
				inpdata = inpdata+clen-rest;
				clen = rest;				
//	printf("mt1 len:%d, clen:%d, metad:%d, l:%d, inpdata:%x,  rest:%d\n",len,clen,metad, l,inpdata,rest );
				if (rest <0) {clen = 0; break;}
			}	// while
//	printf("\nmetaout len:%d, clen:%d, metad:%d, l:%d, inpdata:%x, rest:%d\n",len,clen,metad, l,inpdata,rest );			
			if (rest >=0)
			{	
				metad = header.members.single.metaint - rest ; //until next
				while(getBufferFree() < rest) 
				{					
					vTaskDelay(1);// printf(")");
				}
				if (rest >0) bufferWrite(inpdata, rest); 
				rest = 0;
			}		
		} else 
		{		
			if (header.members.single.metaint != 0) metad -= len;
//	printf("out len = %d, metad = %d  metaint= %d, rest:%d\n",len,metad,header.members.single.metaint,rest);
			while(getBufferFree() < len) 
				{vTaskDelay(1); }
			if (len >0) bufferWrite(pdata+rest, len);	
		}
// ---------------			
	if ((!playing )&& ((getBufferFree() < (BUFFER_SIZE/2)) ||(once ==1)) ) {
			volume = VS1053_GetVolume();
			VS1053_SetVolume(0);
			playing=1;
			if (once == 0)vTaskDelay(30);
			VS1053_SetVolume(volume);
			printf(strplaying);
			if (!ledStatus) gpio2_output_set(0);
		}	
    }
}

#define VSTASKBUF	1024
IRAM_ATTR void vsTask(void *pvParams) { 
	uint8_t b[VSTASKBUF];
//	portBASE_TYPE uxHighWaterMark;
	struct device_settings *device;
	register uint16_t size ,s;
	Delay(100);
	VS1053_Start();
	device = getDeviceSettings();
	Delay(300);
	VS1053_SetVolume( device->vol);	
	VS1053_SetTreble(device->treble);
	VS1053_SetBass(device->bass);
	VS1053_SetTrebleFreq(device->freqtreble);
	VS1053_SetBassFreq(device->freqbass);
	VS1053_SetSpatial(device->spacial);
	incfree(device,"device");	
	VS1053_SPI_SpeedUp();
	while(1) {
		if(playing) {			
			size = bufferRead(b, VSTASKBUF);
			s = 0; 			
			while(s < size) 
			{
				s += VS1053_SendMusicBytes(b+s, size-s);
//				printf("s:%d  size:%d\n",s,size);
			}
			vTaskDelay(1);			
		} else 
		{
			vTaskDelay(30);		
//	uxHighWaterMark = uxTaskGetStackHighWaterMark( NULL );
//	printf("watermark vstask: %x  %d\n",uxHighWaterMark,uxHighWaterMark);			
		}	
	}
}

ICACHE_FLASH_ATTR void clientTask(void *pvParams) {
//1440	for MTU 
	struct timeval timeout; 
    timeout.tv_usec = 0;
	int sockfd;
	int bytes_read;
	char useragent[41];
	struct device_settings *device;
	struct sockaddr_in dest;
	uint8_t bufrec[RECEIVE+10];

	device = getDeviceSettings();
	strcpy(useragent,device->ua);
	if (strlen(useragent) == 0) 
	{
		strcpy(useragent,"Karadio/1.1");
		strcpy(device->ua,"Karadio/1.1");
	}	
	free(device);

	//	portBASE_TYPE uxHighWaterMark;
//	clearHeaders();
/*
	uxHighWaterMark = uxTaskGetStackHighWaterMark( NULL );
	printf("watermark:%d  heap:%d\n",uxHighWaterMark,xPortGetFreeHeapSize( ));
*/	
	while(1) {
		xSemaphoreGive(sConnected);

		if(xSemaphoreTake(sConnect, portMAX_DELAY)) {

			xSemaphoreTake(sDisconnect, 0);

			sockfd = socket(AF_INET, SOCK_STREAM, 0);
			if(sockfd >= 0) ; //printf("WebClient Socket created\n");
			else printf("WebClient Socket creation failed\n");
			bzero(&dest, sizeof(dest));
			dest.sin_family = AF_INET;
			dest.sin_port = htons(clientPort);
			dest.sin_addr.s_addr = inet_addr(inet_ntoa(*(struct in_addr*)(server -> h_addr_list[0])));

			/*---Connect to server---*/
			if(connect(sockfd, (struct sockaddr*)&dest, sizeof(dest)) >= 0) 
			{
//				printf("WebClient Socket connected\n");
				memset(bufrec,0, RECEIVE);
				
				char *t0 = strstr(clientPath, ".m3u");
				if (t0 == NULL)  t0 = strstr(clientPath, ".pls");
				if (t0 == NULL)  t0 = strstr(clientPath, ".xspf");				
				if (t0 == NULL)  t0 = strstr(clientPath, ".m3u8");				
				if (t0 != NULL)  // a playlist asked
				{
				  cstatus = C_PLAYLIST;
				  sprintf(bufrec, "GET %s HTTP/1.0\r\nHOST: %s\r\n\r\n", clientPath,clientURL); //ask for the playlist
			    } 
				else 
				{
//					if ((strcmp(clientPath,"/") ==0)&&(cstatus != C_HEADER0)) clientSetPath("/;");
					if (strcmp(clientURL,"stream.pcradio.biz") ==0) strcpy(useragent,"pcradio");
					sprintf(bufrec, "GET %s HTTP/1.1\r\nHost: %s\r\nicy-metadata: 1\r\nUser-Agent: %s\r\n\r\n", clientPath,clientURL,useragent); 
				}
//printf("st:%d, Client Sent:\n%s\n",cstatus,bufrec);
				send(sockfd, bufrec, strlen(bufrec), 0);								
				xSemaphoreTake(sConnected, 0);
///// set timeout
				if (once == 0)
					timeout.tv_sec = 10000; // bug *1000 for seconds
				else
					timeout.tv_sec = 2000; // bug *1000 for seconds

				if (setsockopt (sockfd, SOL_SOCKET, SO_RCVTIMEO, (char *)&timeout, sizeof(timeout)) < 0)
					printf("setsockopt failed\n");
//////				
				do
				{
					bytes_read = recvfrom(sockfd, bufrec,RECEIVE, 0, NULL, NULL);						
//printf("  %d  ", bytes_read);
//if (bytes_read < 1000 )  
//printf(" Client Rec:%d\n%s\n",bytes_read,bufrec);
					if ( bytes_read > 0 )
//if (cstatus != C_DATA) // test
							clientReceiveCallback(sockfd,bufrec, bytes_read);
					if(xSemaphoreTake(sDisconnect, 0)){ clearHeaders(); break;	}
				}
				while ( bytes_read > 0 );
			} else
			{
				printf("WebClient Socket fails to connect %d\n", errno);
				clientSaveOneHeader("Invalid address",15,METANAME);
				wsHeaders();	
				vTaskDelay(200);	
			}	
			/*---Clean up---*/
			if (bytes_read <= 0 )  //nothing received or error or disconnected
			{				
					if ((playing)&&(once == 0))  // try restart
					{
						clientDisconnect("try restart"); 
						clientConnect();
						playing=1; // force
//						printf(strplaying);
					}	
					else if ((!playing)&&(once == 1)){ // nothing played. Force the read of the buffer
						// some data not played						
						if ((!playing )&& (getBufferFree() < (BUFFER_SIZE))) {						
							playing=1;
							vTaskDelay(1);
							if (VS1053_GetVolume()==0) VS1053_SetVolume(volume);
							printf(strplaying);
							while (getBufferFree() < (BUFFER_SIZE)) vTaskDelay(200);							
							vTaskDelay(200);
							playing=0;
							clientDisconnect("data not played"); 
						}
					}						
						//						
					else if ((!playing)&&(once == 0)) {  // nothing received
							clientSaveOneHeader(notfound, 9,METANAME);
							wsHeaders();
					}	
					else{  //playing & once=1 and no more received stream
						while (getBufferFree() < (BUFFER_SIZE)) vTaskDelay(200);
						vTaskDelay(200);
						clientDisconnect("once"); 						
					}					
			}//jpc
						
/*			// marker for heap size (debug)
			uxHighWaterMark = uxTaskGetStackHighWaterMark( NULL );
			printf("watermark:%d  heap:%d\n",uxHighWaterMark,xPortGetFreeHeapSize( ));
*/
			if (playing)  // stop clean
			{		
				volume = VS1053_GetVolume();
				VS1053_SetVolume(0);
				VS1053_flush_cancel(2);
				playing = 0;
				vTaskDelay(20);	
				VS1053_SetVolume(volume);
			}	

			bufferReset();
			shutdown(sockfd,SHUT_RDWR); // stop the socket
			vTaskDelay(10);	
			close(sockfd);
//			printf("WebClient Socket closed\n");
			if (cstatus == C_PLAYLIST) 			
			{
			  clientConnect();
			}
		}
	}
}
