    icl 'hardware.asm'

    org $80
index org *+1
indexend org *+1
wavei org *+1
offset org *+1
range org *+1
pindex org *+1

    org $2000
lo240
    ert <*!=0
    :8 dta $A0
    :240 dta $A0|[[#+1+[#/15]]&$F]
    :8 dta $AF
hi240
    ert <*!=0
    :8 dta $10
    :240 dta $10|[[#+1+[#/15]]>>4]
    :8 dta $1F
lo256
    ert <*!=0
    :256 dta $A0|[#&$F]
hi256
    ert <*!=0
    :256 dta $10|[#>>4]

dlist
    :4 dta $70
    dta $47,a(scr)
    :8 dta $7
    dta $41,a(dlist)
scr
scr_wave equ *+12
    dta d'* WAVEFORM: TRI     '
scr_range equ *+12
    dta d'  RANGE:    240     '
scr_offset equ *+12
    dta d'  OFFSET:   0       '
scr_pulse equ *+12
    dta d'  PULSE:    3/5     '
    dta d'                    '
    dta d' W/S - UP/DOWN      '
    dta d' A/D - CHANGE OPTION'
    dta d'                    '
    dta d'                    '

ends
    dta waveiend,rangeend,$FF,pindexend


    org [*+$FF]&$FF00
wavesinfull
>>> for ($i = 0; $i < 256; ++$i) {
>>>   $s = int(sin($i / 128 * 3.141592654 + 0.29) * 119.9 + 128);
;>>>   $s = int(sin($i / 128 * 3.141592654) * 119.9 + 128);
    dta <<<$s>>>
>>> }
    org [*+$FF]&$FF00
wavetri
>>> for ($i = 0; $i < 256; ++$i) {
>>>   $s = ($i & 0x40) ? 0x40 - ($i & 0x3F) : ($i & 0x3F);
>>>   $s += 0x60;
    dta <<<$s>>>
>>> }
    org [*+$FF]&$FF00
wavetri14
>>> $period = 8*14;
>>> $pad = (256-$period/2)>>1;
>>> for ($i = 0; $i < $period; ++$i) {
>>>   $s = $i<$period/2 ? $pad + $i : 256 - $pad - ($i - $period/2);
    dta <<<$s>>>
>>> }
    org [*+$FF]&$FF00
wavetrifull
>>> for ($i = 0; $i < 256; ++$i) {
>>>   $s = int(8 + ($i < 128 ? $i : 255 - $i) * 240 / 128);
>>>   $s += 0x08;
    dta <<<$s>>>
>>> }

lolo
    dta <lo240,<lo256
lohi
    dta >lo240,>lo256
hilo
    dta <hi240,<hi256
hihi
    dta >hi240,>hi256
rangeend equ *-hihi
wavelo
    dta <wavetri,<wavetri14,<wavetrifull,<wavesinfull
wavehi
    dta >wavetri,>wavetri14,<wavetrifull,>wavesinfull
waveend
    dta $7F,8*14,$FF,$FF
waveiend equ *-waveend


main
    sei
    mva #0 NMIEN
    sta DMACTL
    sta AUDCTL
    mva #$F COLPM0 ; channel 1
    mva #$FF GRAFP0
    mva #0 offset
    sta wavei
    sta range
    sta pindex

reset
    lda:rne VCOUNT
    inc WSYNC
    mwa #dlist DLISTL
    mva #$22 DMACTL

    ldx wavei
    mva waveend,x cmpindex+1
    mva wavelo,x ldwave+1
    mva wavehi,x ldwave+2
    ldy range
    mva lolo,y ldlo+1
    mva lohi,y ldlo+2
    mva hilo,y ldhi+1
    mva hihi,y ldhi+2
    mva offset index

start
    jsr setpulse

    ldy index ; 3 cycles
play
ldwave
    ldx $FFFF,y
ldhi
    lda $FFFF,x ; 4 cycles
ldlo
    ldy $FFFF,x ; 4 cycles
    inc WSYNC ; Guarantee next instruction starts on cycle 105
    sta AUDC3 ; 4 cycles
    sty AUDC1
    stx HPOSP0 ; 4 cycles
    ldy index
cmpindex
    cpy #$FF
    sne:ldy #$FF
    iny
    sty index
    lda SKSTAT
    and #4
keyjmp
    beq keydown
    jmp play

keyup
    mva #{beq} keyjmp
    mva #[keydown-keyjmp-2] keyjmp+1
    jmp play
keydown
    mva #{bne} keyjmp
    mva #[keyup-keyjmp-2] keyjmp+1
    inc scr_offset
    inc wavei
    lda KBCODE
;    cmp #31 ; '1'
;    sne:mvx #0 optwaveform
;    cmp #30 ; '2'
;    sne:mvx #1 optwaveform
;    cmp #26 ; '3'
;    sne:mvx #2 optwaveform
;    cmp #24 ; '4'
;    sne:mvx #3 optwaveform
    jmp reset

setpulse
    ; 1.79Mhz for channel 1
FAST1 equ 1<<6
    ; 1.79Mhz for channel 3
FAST3 equ 1<<5
    ; HiPass 1+3
HI13 equ 1<<2
    ; 15Khz
KHZ15 equ 1<<0
    mva #[FAST1|FAST3|HI13] AUDCTL
    ; Set up 1/16 dutycycle HiPass on 1+3
    ldx pindex
    mva paudf3,x AUDF3
    mva paudf1,x AUDF1
    sta STIMER
    sta AUDF3
    ;ldx delay
    ;dex:rne
    rts
;delay
;    dta 8
paudf1
    dta 3,2
paudf3
    dta 5,4
pindexend equ *-paudf3

    run main
