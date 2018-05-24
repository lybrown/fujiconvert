; GTIA Write
HPOSP0  equ $d000
HPOSP1  equ $d001
HPOSP2  equ $d002
HPOSP3  equ $d003
HPOSM0  equ $d004
HPOSM1  equ $d005
HPOSM2  equ $d006
HPOSM3  equ $d007
SIZEP0  equ $d008
SIZEP1  equ $d009
SIZEP2  equ $d00a
SIZEP3  equ $d00b
SIZEM   equ $d00c
GRAFP0  equ $d00d
GRAFP1  equ $d00e
GRAFP2  equ $d00f
GRAFP3  equ $d010
GRAFM   equ $d011
COLPM0  equ $d012
COLPM1  equ $d013
COLPM2  equ $d014
COLPM3  equ $d015
COLPF0  equ $d016
COLPF1  equ $d017
COLPF2  equ $d018
COLPF3  equ $d019
COLBK   equ $d01a
PRIOR   equ $d01b
VDELAY  equ $d01c
GRACTL  equ $d01d
HITCLR  equ $d01e
CONSOL  equ $d01f

; GTIA Read
M0PF    equ $d000
M1PF    equ $d001
M2PF    equ $d002
M3PF    equ $d003
P0PF    equ $d004
P1PF    equ $d005
P2PF    equ $d006
P3PF    equ $d007
M0PL    equ $d008
M1PL    equ $d009
M2PL    equ $d00a
M3PL    equ $d00b
P0PL    equ $d00c
P1PL    equ $d00d
P2PL    equ $d00e
P3PL    equ $d00f
TRIG0   equ $d010
TRIG1   equ $d011
TRIG2   equ $d012
TRIG3   equ $d013
PAL     equ $d014

; POKEY Write
AUDF1   equ $d200
AUDC1   equ $d201
AUDF2   equ $d202
AUDC2   equ $d203
AUDF3   equ $d204
AUDC3   equ $d205
AUDF4   equ $d206
AUDC4   equ $d207
AUDCTL  equ $d208
STIMER  equ $d209
SKREST  equ $d20a
POTGO   equ $d20b
SEROUT  equ $d20d
IRQEN   equ $d20e
SKCTL   equ $d20f

; POKEY Read
POT0    equ $d200
POT1    equ $d201
POT2    equ $d202
POT3    equ $d203
POT4    equ $d204
POT5    equ $d205
POT6    equ $d206
POT7    equ $d207
ALLPOT  equ $d208
KBCODE  equ $d209
RANDOM  equ $d20a
SERIN   equ $d20d
IRQST   equ $d20e
SKSTAT  equ $d20f

; PIA
PORTA   equ $d300
PORTB   equ $d301
PACTL   equ $d302
PBCTL   equ $d303

; ANTIC
DMACTL  equ $d400
CHACTL  equ $d401
DLISTL  equ $d402
DLISTH  equ $d403
HSCROL  equ $d404
VSCROL  equ $d405
PMBASE  equ $d407
CHBASE  equ $d409
WSYNC   equ $d40a
VCOUNT  equ $d40b ; Read
PENH    equ $d40c ; Read
PENV    equ $d40d ; Read
NMIEN   equ $d40e
NMIRES  equ $d40f ; Write
NMIST   equ $d40f ; Read

; ROM
STDCH	equ $e000
